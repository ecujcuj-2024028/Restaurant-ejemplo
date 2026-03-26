'use strict';

import DeliveryOrder from './delivery.model.js';
import Product       from '../product/products-model.js';
import Restaurant    from '../restaurants/restaurant.model.js';
import { InventoryItem } from '../inventory/inventory.model.js';
import { findUserById }  from '../../helpers/user-db.js';
import { sendInvoiceEmail } from '../../helpers/email-service.js';
import STATUS_TRANSITIONS from '../../helpers/status-transitions.js'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages : Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
});



// Timestamps asociados a cada estado
const STATUS_TIMESTAMPS = {
    confirmado      : 'confirmedAt',
    listo_para_envio: 'preparedAt',
    en_camino       : 'pickedUpAt',
    entregado       : 'deliveredAt',
    cancelado       : 'cancelledAt',
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /delivery  — Crear pedido a domicilio
   Solo usuarios verificados (Status: true en PostgreSQL)
───────────────────────────────────────────────────────────────────────────── */
export const createDeliveryOrder = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString();

        // Verificar que el usuario está activo/verificado (ya lo hace validateJWT,
        // pero lo reforzamos aquí para ser explícitos)
        if (!req.user.Status) {
            return res.status(403).json({
                success: false,
                message: 'Debes verificar tu cuenta antes de realizar pedidos a domicilio.',
            });
        }

        const { restaurantId, items, deliveryAddress, paymentMethod, notes } = req.body;

        // ── Validaciones básicas ──────────────────────────────────────────────
        if (!restaurantId || !items || items.length === 0 || !deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: 'Los campos restaurantId, items y deliveryAddress son obligatorios.',
            });
        }

        if (!deliveryAddress.street || !deliveryAddress.city) {
            return res.status(400).json({
                success: false,
                message: 'La dirección de entrega requiere street y city.',
            });
        }

        // ── Verificar restaurante activo ──────────────────────────────────────
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado o inactivo.',
            });
        }

        // ── Procesar ítems + descontar inventario ─────────────────────────────
        let subtotal = 0;
        const processedItems = [];
        const inventoryUpdates = []; // acumular para aplicar después

        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cada ítem necesita productId y quantity (mínimo 1).',
                });
            }

            const product = await Product.findById(item.productId);

            if (!product || !product.isActive || !product.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Producto "${item.productId}" no disponible o inexistente.`,
                });
            }

            if (product.restaurant.toString() !== restaurantId) {
                return res.status(400).json({
                    success: false,
                    message: `El producto "${product.name}" no pertenece al restaurante seleccionado.`,
                });
            }

            // Verificar y preparar descuento de inventario por ingredientes
            for (const ingredient of product.ingredients) {
                const invItem = await InventoryItem.findOne({
                    where: {
                        RestaurantId: restaurantId,
                        Name: ingredient.name,
                    },
                });

                if (!invItem) {
                    return res.status(400).json({
                        success: false,
                        message: `No existe inventario para el insumo: ${ingredient.name}`,
                    });
                }

                const needed = (parseFloat(ingredient.quantity) || 1) * item.quantity;
                if (parseFloat(invItem.Quantity) < needed) {
                    return res.status(400).json({
                        success: false,
                        message: `Stock insuficiente para "${ingredient.name}". Disponible: ${invItem.Quantity}`,
                    });
                }

                inventoryUpdates.push({ invItem, needed });
            }

            const itemSubtotal = product.price * item.quantity;
            subtotal += itemSubtotal;

            processedItems.push({
                productId          : product._id,
                name               : product.name,
                quantity           : item.quantity,
                price              : product.price,
                subtotal           : itemSubtotal,
                specialInstructions: item.specialInstructions || null,
            });
        }

        // ── Aplicar descuentos de inventario ──────────────────────────────────
        for (const { invItem, needed } of inventoryUpdates) {
            invItem.Quantity = parseFloat(invItem.Quantity) - needed;
            await invItem.save();

            if (parseFloat(invItem.Quantity) <= parseFloat(invItem.MinStock)) {
                console.log(`[Delivery] Stock crítico: ${invItem.Name} = ${invItem.Quantity}`);
            }
        }

        // ── Calcular total con tarifa de envío ────────────────────────────────
        const deliveryFee = 15.00; // tarifa fija, se puede volver dinámica
        const total = subtotal + deliveryFee;

        // ── Crear pedido ──────────────────────────────────────────────────────
        const order = await DeliveryOrder.create({
            restaurantId,
            userId,
            items        : processedItems,
            subtotal,
            deliveryFee,
            total,
            deliveryAddress,
            paymentMethod: paymentMethod || 'efectivo',
            notes        : notes || null,
            estimatedDeliveryTime: 45,
        });

        const populated = await DeliveryOrder.findById(order._id)
            .populate('restaurantId', 'name address')
            .populate('items.productId', 'name image');

        return res.status(201).json({
            success: true,
            message : `Pedido a domicilio creado. Tiempo estimado: ${order.estimatedDeliveryTime} minutos.`,
            order   : populated,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /delivery/my-orders  — Pedidos del usuario autenticado
───────────────────────────────────────────────────────────────────────────── */
export const getMyDeliveryOrders = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString();
        const { status } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { userId };
        if (status) filter.status = status;

        const [total, orders] = await Promise.all([
            DeliveryOrder.countDocuments(filter),
            DeliveryOrder.find(filter)
                .populate('restaurantId', 'name address photos')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success   : true,
            pagination: buildMeta(page, limit, total),
            orders,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /delivery/:id  — Detalle de un pedido
───────────────────────────────────────────────────────────────────────────── */
export const getDeliveryOrderById = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString();
        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);

        const order = await DeliveryOrder.findById(req.params.id)
            .populate('restaurantId', 'name address')
            .populate('items.productId', 'name image');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        // El cliente solo puede ver sus propios pedidos
        const isAdmin = userRoles.includes('ADMIN_SISTEMA');
        const isRestaurantAdmin = userRoles.includes('ADMIN_RESTAURANTE');

        if (!isAdmin && !isRestaurantAdmin && order.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver este pedido.',
            });
        }

        return res.status(200).json({ success: true, order });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /delivery/restaurant/:restaurantId  — Pedidos de un restaurante (ADMIN)
───────────────────────────────────────────────────────────────────────────── */
export const getDeliveryOrdersByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { status } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { restaurantId };
        if (status) filter.status = status;

        const [total, orders] = await Promise.all([
            DeliveryOrder.countDocuments(filter),
            DeliveryOrder.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success   : true,
            pagination: buildMeta(page, limit, total),
            orders,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /delivery/:id/status  — Actualizar estado (ADMIN_RESTAURANTE / ADMIN_SISTEMA)
───────────────────────────────────────────────────────────────────────────── */
export const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancellationReason } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'El campo status es requerido.' });
        }

        const order = await DeliveryOrder.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        const allowed = STATUS_TRANSITIONS[order.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Transición inválida: de '${order.status}' no se puede pasar a '${status}'. Permitidos: [${allowed?.join(', ') || 'ninguno'}]`,
            });
        }

        order.status = status;

        // Registrar timestamp
        const tsField = STATUS_TIMESTAMPS[status];
        if (tsField) order[tsField] = new Date();

        // Datos extra para cancelación
        if (status === 'cancelado') {
            order.cancellationReason = cancellationReason || 'Sin especificar';
            order.cancelledBy        = req.body.cancelledBy || 'restaurante';
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: `Estado actualizado a '${status}'.`,
            order,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /delivery/:id/cancel  — Cancelar pedido (CLIENTE — solo estados cancelables)
───────────────────────────────────────────────────────────────────────────── */
export const cancelDeliveryOrder = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString();
        const { id } = req.params;
        const { cancellationReason } = req.body;

        const order = await DeliveryOrder.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        if (order.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes cancelar tus propios pedidos.',
            });
        }

        const cancelableStatuses = ['pendiente', 'confirmado'];
        if (!cancelableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `No se puede cancelar un pedido en estado '${order.status}'. Solo se permite cancelar pedidos pendientes o confirmados.`,
            });
        }

        // Reintegrar inventario
        for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;

            for (const ingredient of product.ingredients) {
                const invItem = await InventoryItem.findOne({
                    where: {
                        RestaurantId: order.restaurantId.toString(),
                        Name        : ingredient.name,
                    },
                });
                if (invItem) {
                    const qty = (parseFloat(ingredient.quantity) || 1) * item.quantity;
                    invItem.Quantity = parseFloat(invItem.Quantity) + qty;
                    await invItem.save();
                }
            }
        }

        order.status             = 'cancelado';
        order.cancelledBy        = 'cliente';
        order.cancellationReason = cancellationReason || 'Cancelado por el cliente';
        order.cancelledAt        = new Date();
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Pedido cancelado correctamente.',
            order,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /delivery/:id/invoice  — Generar factura de pedido entregado
───────────────────────────────────────────────────────────────────────────── */
export const getDeliveryInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.Id?.toString();

        const order = await DeliveryOrder.findById(id)
            .populate('restaurantId', 'name address');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        if (order.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes ver la factura de tus propios pedidos.',
            });
        }

        if (order.status !== 'entregado') {
            return res.status(400).json({
                success: false,
                message: 'Solo se puede generar factura de pedidos entregados.',
            });
        }

        if (order.invoiceGenerated) {
            return res.status(400).json({
                success: false,
                message: 'La factura de este pedido ya fue generada anteriormente.',
            });
        }

        const customer    = await findUserById(userId);
        const invoiceNumber = `DEL-${order._id.toString().slice(-8).toUpperCase()}`;
        const date          = new Date(order.updatedAt).toLocaleString('es-GT', {
            dateStyle: 'long',
            timeStyle: 'short',
        });

        const customerName  = customer ? `${customer.Name} ${customer.Surname}` : 'Cliente';
        const customerEmail = customer?.Email;

        const invoice = {
            invoiceNumber,
            date,
            restaurantName : order.restaurantId?.name || 'Restaurante',
            customerName,
            deliveryAddress: order.deliveryAddress,
            items          : order.items.map(i => ({
                name    : i.name,
                quantity: i.quantity,
                price   : i.price,
                subtotal: i.subtotal,
            })),
            subtotal   : order.subtotal,
            deliveryFee: order.deliveryFee,
            total      : order.total,
            paymentMethod: order.paymentMethod,
            status     : 'pagado',
        };

        order.invoiceGenerated = true;
        await order.save();

        // Enviar por email en background
        if (customerEmail) {
            sendInvoiceEmail({
                customerEmail,
                customerName,
                restaurantName: invoice.restaurantName,
                invoiceNumber,
                date,
                tableNumber   : 'Domicilio',
                items         : invoice.items,
                total         : invoice.total,
            }).catch(err => console.error('[Delivery] Error enviando factura:', err.message));
        }

        return res.status(200).json({
            success: true,
            message: 'Factura generada correctamente.',
            invoice,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};