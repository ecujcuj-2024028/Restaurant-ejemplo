'use strict';

import { DataTypes } from 'sequelize';
import { sequelize } from '../../configs/db-postgres.js';
import { generateUserId } from '../../helpers/uuid-generator.js';

export const InventoryItem = sequelize.define(
    'InventoryItem',
    {
        Id: {
            type: DataTypes.STRING(16),
            primaryKey: true,
            field: 'id',
            defaultValue: () => generateUserId(),
        },

        // ID del restaurante dueño del insumo
        RestaurantId: {
            type: DataTypes.STRING(24),
            allowNull: false,
            field: 'restaurant_id',
            validate: {
                notEmpty: { msg: 'El ID del restaurante es obligatorio.' },
            },
        },

        // Referencia al producto en MongoDB
        MongoProductId: {
            type: DataTypes.STRING(24),
            allowNull: true,
            field: 'mongo_product_id',
        },

        Name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'name',
            validate: {
                notEmpty: { msg: 'El nombre del insumo es obligatorio.' },
                len: { args: [1, 100], msg: 'El nombre no puede superar 100 caracteres.' },
            },
        },

        Quantity: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            defaultValue: 0,
            field: 'quantity',
            validate: {
                min: { args: [0], msg: 'La cantidad no puede ser negativa.' },
            },
        },

        Unit: {
            type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'unidades'),
            allowNull: false,
            defaultValue: 'unidades',
            field: 'unit',
        },

        // ── DATOS FINANCIEROS ──────────────────────
        CostPerUnit: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            field: 'cost_per_unit',
            validate: {
                min: { args: [0], msg: 'El costo no puede ser negativo.' },
            },
        },

        // Umbral mínimo: cuando quantity <= minStock se dispara la alerta
        MinStock: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            defaultValue: 5,
            field: 'min_stock',
            validate: {
                min: { args: [0], msg: 'El stock mínimo no puede ser negativo.' },
            },
        },

        IsActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
    },
    {
        tableName: 'inventory_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',

        // Índice: nombre único por restaurante
        indexes: [
            {
                unique: true,
                fields: ['restaurant_id', 'name'],
                name: 'uq_inventory_restaurant_name',
            },
        ],
    }
);
