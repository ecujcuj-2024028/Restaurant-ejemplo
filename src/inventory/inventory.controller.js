'use strict';

import { Op } from 'sequelize';
import { InventoryItem } from './inventory.model.js';
import { sendLowStockEmail } from '../../helpers/email-service.js';
import { User }              from '../user/user.model.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: verificar y notificar stock bajo
───────────────────────────────────────────────────────────────────────────── */
const checkAndNotifyLowStock = async (item, restaurantId) => {
    if (parseFloat(item.Quantity) <= parseFloat(item.MinStock)) {
        try {
            // Buscar el admin dueño del restaurante (ownerId guardado en Mongo Restaurant,
            // pero también podemos notificar al root admin)
            const adminEmail = process.env.ROOT_ADMIN_EMAIL;
            const adminName  = 'Administrador';

            if (adminEmail) {
                await sendLowStockEmail({
                    adminEmail,
                    adminName,
                    itemName    : item.Name,
                    currentStock: parseFloat(item.Quantity),
                    minStock    : parseFloat(item.MinStock),
                    unit        : item.Unit,
                    restaurantId,
                });
            }
        } catch (emailErr) {
            console.error('[Inventory] Error enviando alerta de stock bajo:', emailErr.message);
        }
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /inventory-pg
   Crea un ítem de inventario en Postgres
───────────────────────────────────────────────────────────────────────────── */
export const createInventoryItemPg = async (req, res) => {
    try {
        const {
            restaurantId,
            mongoProductId,
            name,
            quantity,
            unit,
            costPerUnit,
            minStock,
        } = req.body;

        if (!restaurantId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Los campos restaurantId y name son obligatorios.',
            });
        }

        // Verificar duplicado (nombre único por restaurante)
        const existing = await InventoryItem.findOne({
            where: { RestaurantId: restaurantId, Name: name, IsActive: true },
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Ya existe un ítem con el nombre "${name}" en este restaurante.`,
            });
        }

        const item = await InventoryItem.create({
            RestaurantId  : restaurantId,
            MongoProductId: mongoProductId || null,
            Name          : name,
            Quantity      : quantity    ?? 0,
            Unit          : unit        ?? 'unidades',
            CostPerUnit   : costPerUnit ?? 0,
            MinStock      : minStock    ?? 5,
        });

        // Verificar si ya inicia con stock bajo
        await checkAndNotifyLowStock(item, restaurantId);

        return res.status(201).json({
            success: true,
            item,
        });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un ítem con ese nombre en el restaurante.',
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /inventory-pg/:restaurantId
   Lista ítems de inventario de un restaurante
───────────────────────────────────────────────────────────────────────────── */
export const getInventoryByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { lowStock }     = req.query;   // ?lowStock=true  → solo los que están bajos

        const where = { RestaurantId: restaurantId, IsActive: true };

        const items = await InventoryItem.findAll({ where, order: [['Name', 'ASC']] });

        // Marcar cuáles están bajo el umbral
        const enriched = items.map(item => {
            const plain      = item.toJSON();
            plain.isLowStock = parseFloat(plain.Quantity) <= parseFloat(plain.MinStock);
            plain.totalCost  = (parseFloat(plain.Quantity) * parseFloat(plain.CostPerUnit)).toFixed(2);
            return plain;
        });

        const filtered = lowStock === 'true'
            ? enriched.filter(i => i.isLowStock)
            : enriched;

        return res.status(200).json({
            success: true,
            count  : filtered.length,
            items  : filtered,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /inventory-pg/:id/quantity
   Actualiza la cantidad de un ítem (descuento o reposición)
───────────────────────────────────────────────────────────────────────────── */
export const updateQuantity = async (req, res) => {
    try {
        const { id }       = req.params;
        const { quantity, operation } = req.body;
        // operation: 'set' | 'add' | 'subtract'  (default: 'set')

        if (quantity === undefined || quantity === null) {
            return res.status(400).json({
                success: false,
                message: 'El campo quantity es obligatorio.',
            });
        }

        const item = await InventoryItem.findByPk(id);

        if (!item || !item.IsActive) {
            return res.status(404).json({
                success: false,
                message: 'Ítem de inventario no encontrado.',
            });
        }

        let newQty;
        switch (operation) {
            case 'add':
                newQty = parseFloat(item.Quantity) + parseFloat(quantity);
                break;
            case 'subtract':
                newQty = parseFloat(item.Quantity) - parseFloat(quantity);
                if (newQty < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Stock insuficiente. Disponible: ${item.Quantity} ${item.Unit}.`,
                    });
                }
                break;
            default: // 'set'
                newQty = parseFloat(quantity);
        }

        item.Quantity = newQty;
        await item.save();

        // Verificar stock bajo después de actualizar
        await checkAndNotifyLowStock(item, item.RestaurantId);

        return res.status(200).json({
            success : true,
            item    : {
                ...item.toJSON(),
                isLowStock: parseFloat(item.Quantity) <= parseFloat(item.MinStock),
                totalCost : (parseFloat(item.Quantity) * parseFloat(item.CostPerUnit)).toFixed(2),
            },
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /inventory-pg/:id
   Actualiza todos los campos de un ítem (incluido costPerUnit y minStock)
───────────────────────────────────────────────────────────────────────────── */
export const updateInventoryItem = async (req, res) => {
    try {
        const { id }  = req.params;
        const allowed = ['Name', 'Quantity', 'Unit', 'CostPerUnit', 'MinStock'];

        const item = await InventoryItem.findByPk(id);

        if (!item || !item.IsActive) {
            return res.status(404).json({
                success: false,
                message: 'Ítem de inventario no encontrado.',
            });
        }

        // Solo actualizar campos permitidos
        allowed.forEach(field => {
            if (req.body[field.charAt(0).toLowerCase() + field.slice(1)] !== undefined) {
                item[field] = req.body[field.charAt(0).toLowerCase() + field.slice(1)];
            }
        });

        await item.save();
        await checkAndNotifyLowStock(item, item.RestaurantId);

        return res.status(200).json({ success: true, item });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /inventory-pg/:id
   Eliminación lógica
───────────────────────────────────────────────────────────────────────────── */
export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await InventoryItem.findByPk(id);

        if (!item || !item.IsActive) {
            return res.status(404).json({
                success: false,
                message: 'Ítem de inventario no encontrado.',
            });
        }

        item.IsActive = false;
        await item.save();

        return res.status(200).json({
            success: true,
            message: 'Ítem eliminado del inventario.',
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
