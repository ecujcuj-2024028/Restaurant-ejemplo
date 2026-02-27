import Order from './order.model.js';
import Product from '../product/products-model.js';
import { InventoryItem } from '../inventory/inventory.model.js';
import Reservation from '../Reservations/reservation.model.js';
import Restaurant from '../restaurants/restaurant.model.js';
import { findUserById } from '../../helpers/user-db.js';
import { sendInvoiceEmail } from '../../helpers/email-service.js';

export const createOrder = async (req, res) => {
  try {
    const { tableNumber, items, restaurantId } = req.body;
    const userId = req.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Debe enviar al menos un producto" });
    }

    let total = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || !product.isActive || !product.isAvailable) {
        return res.status(400).json({ message: `Producto inválido o no disponible` });
      }

      const subtotal = product.price * item.quantity;
      total += subtotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });

      for (const ingredient of product.ingredients) {
        const inventoryItem = await InventoryItem.findOne({
          where: {
            RestaurantId: restaurantId,
            Name: ingredient.name
          }
        });

        if (!inventoryItem) {
          return res.status(400).json({
            message: `No existe inventario para el insumo: ${ingredient.name}`
          });
        }

        if (parseFloat(inventoryItem.Quantity) < item.quantity) {
          return res.status(400).json({
            message: `Stock insuficiente para ${ingredient.name}. Disponible: ${inventoryItem.Quantity}`
          });
        }

        const ingredientQty = parseFloat(ingredient.quantity) || 1;
        inventoryItem.Quantity = parseFloat(inventoryItem.Quantity) - (ingredientQty * item.quantity);
        await inventoryItem.save();

        if (parseFloat(inventoryItem.Quantity) <= parseFloat(inventoryItem.MinStock)) {
          console.log(`ALERTA: Stock crítico de ${inventoryItem.Name}. Nivel actual: ${inventoryItem.Quantity}`);
        }
      }
    }

    const newOrder = new Order({
      restaurantId,
      userId,
      tableNumber,
      items: processedItems,
      total
    });

    await newOrder.save();

    return res.status(201).json({
      message: "Pedido creado correctamente",
      order: newOrder
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error al crear el pedido",
      error: error.message
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    if (!['recibido', 'en_preparacion'].includes(order.status)) {
      return res.status(400).json({ message: "No se puede cancelar este pedido" });
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      for (const ingredient of product.ingredients) {
        const inventoryItem = await InventoryItem.findOne({
          where: {
            RestaurantId: order.restaurantId.toString(),
            Name: ingredient.name
          }
        });

        if (inventoryItem) {
          const ingredientQty = parseFloat(ingredient.quantity) || 1;
          inventoryItem.Quantity = parseFloat(inventoryItem.Quantity) + (ingredientQty * item.quantity);
          await inventoryItem.save();
        }
      }
    }

    order.status = 'cancelado';
    await order.save();

    return res.json({ message: "Pedido cancelado correctamente", order });

  } catch (error) {
    return res.status(500).json({
      message: "Error al cancelar pedido",
      error: error.message
    });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const reservations = await Reservation.find({
      userId,
      status: { $ne: 'cancelada' }
    }).sort({ createdAt: -1 });

    return res.json({ page, limit, orders, reservations });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener historial",
      error: error.message
    });
  }
};

// ─── GESTIÓN DE ESTADOS ────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  recibido: 'en_preparacion',
  en_preparacion: 'listo',
  listo: 'entregado',
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'El campo status es requerido' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const validNext = STATUS_TRANSITIONS[order.status];

    if (!validNext) {
      return res.status(400).json({
        message: `El pedido está en estado '${order.status}' y no puede avanzar`,
      });
    }

    if (status !== validNext) {
      return res.status(400).json({
        message: `Transición inválida. De '${order.status}' solo se puede pasar a '${validNext}'`,
      });
    }

    order.status = status;
    await order.save();

    return res.json({ message: 'Estado actualizado correctamente', order });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};

export const getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId, status } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId es requerido' });
    }

    const filter = { restaurantId };
    if (status) filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    return res.json({ orders });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener pedidos', error: error.message });
  }
};

// ─── FACTURACIÓN ───────────────────────────────────────────────────────────────

export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    if (order.status !== 'entregado') {
      return res.status(400).json({
        message: 'Solo se puede generar factura de pedidos entregados',
      });
    }

    if (order.invoiceGenerated) {
      return res.status(400).json({
        message: 'La factura de este pedido ya fue generada',
      });
    }

    const restaurant = await Restaurant.findById(order.restaurantId);
    const customer = await findUserById(order.userId);

    const invoiceNumber = `INV-${order._id.toString().slice(-8).toUpperCase()}`;
    const date = new Date(order.updatedAt).toLocaleString('es-GT', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const customerName = customer ? `${customer.Name} ${customer.Surname}` : 'Cliente';
    const customerEmail = customer?.Email;
    const restaurantName = restaurant?.name || 'Restaurante';

    const invoice = {
      invoiceNumber,
      date,
      restaurantName,
      customerName,
      tableNumber: order.tableNumber,
      items: order.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal,
      })),
      total: order.total,
      status: 'pagado',
    };

    order.invoiceGenerated = true;
    await order.save();

    if (customerEmail) {
      sendInvoiceEmail({ customerEmail, customerName, restaurantName, ...invoice })
        .catch(err => console.error('Error enviando factura por email:', err));
    }

    return res.json({ message: 'Factura generada correctamente', invoice });
  } catch (error) {
    return res.status(500).json({ message: 'Error al generar factura', error: error.message });
  }
};