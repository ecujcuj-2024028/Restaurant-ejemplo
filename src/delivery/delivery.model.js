'use strict';

import mongoose from 'mongoose';

const deliveryItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'El producto es requerido'],
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'La cantidad mínima es 1'],
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'El precio no puede ser negativo'],
        },
        subtotal: {
            type: Number,
            required: true,
        },
        specialInstructions: {
            type: String,
            trim: true,
            maxlength: [200, 'Las instrucciones no pueden superar 200 caracteres'],
            default: null,
        },
    },
    { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
    {
        street: {
            type: String,
            required: [true, 'La calle es requerida'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'La ciudad es requerida'],
            trim: true,
        },
        zone: {
            type: String,
            trim: true,
            default: null,
        },
        references: {
            type: String,
            trim: true,
            maxlength: [300, 'Las referencias no pueden superar 300 caracteres'],
            default: null,
        },
        coordinates: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
    },
    { _id: false }
);

const deliverySchema = new mongoose.Schema(
    {
        // ── Identificadores ──────────────────────────────────────────────────
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: [true, 'El restaurante es requerido'],
        },
        userId: {
            type: String, // PostgreSQL ID
            required: [true, 'El usuario es requerido'],
            trim: true,
        },

        // ── Productos ────────────────────────────────────────────────────────
        items: {
            type: [deliveryItemSchema],
            validate: {
                validator: (v) => v.length > 0,
                message: 'El pedido debe tener al menos un producto',
            },
        },

        // ── Montos ───────────────────────────────────────────────────────────
        subtotal: {
            type: Number,
            required: true,
            min: [0, 'El subtotal no puede ser negativo'],
        },
        deliveryFee: {
            type: Number,
            default: 15.00,
            min: [0, 'La tarifa de envío no puede ser negativa'],
        },
        total: {
            type: Number,
            required: true,
            min: [0, 'El total no puede ser negativo'],
        },

        // ── Dirección de entrega ─────────────────────────────────────────────
        deliveryAddress: {
            type: deliveryAddressSchema,
            required: [true, 'La dirección de entrega es requerida'],
        },

        // ── Estado del pedido ────────────────────────────────────────────────
        status: {
            type: String,
            enum: {
                values: [
                    'pendiente',       // recién creado, esperando confirmación del restaurante
                    'confirmado',      // restaurante aceptó el pedido
                    'en_preparacion',  // cocinando
                    'listo_para_envio',// listo, esperando repartidor
                    'en_camino',       // repartidor en ruta
                    'entregado',       // entregado al cliente
                    'cancelado',       // cancelado (cliente o restaurante)
                ],
                message: 'Estado de pedido inválido',
            },
            default: 'pendiente',
        },

        // ── Información de pago ──────────────────────────────────────────────
        paymentMethod: {
            type: String,
            enum: ['efectivo', 'tarjeta', 'transferencia'],
            default: 'efectivo',
        },
        paymentStatus: {
            type: String,
            enum: ['pendiente', 'pagado'],
            default: 'pendiente',
        },

        // ── Tiempo estimado ──────────────────────────────────────────────────
        estimatedDeliveryTime: {
            type: Number, // minutos
            default: 45,
            min: [1, 'El tiempo mínimo es 1 minuto'],
        },

        // ── Notas del pedido ─────────────────────────────────────────────────
        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Las notas no pueden superar 500 caracteres'],
            default: null,
        },

        // ── Cancelación ──────────────────────────────────────────────────────
        cancellationReason: {
            type: String,
            trim: true,
            maxlength: [300, 'La razón de cancelación no puede superar 300 caracteres'],
            default: null,
        },
        cancelledBy: {
            type: String,
            enum: ['cliente', 'restaurante', 'sistema', null],
            default: null,
        },

        // ── Factura ──────────────────────────────────────────────────────────
        invoiceGenerated: {
            type: Boolean,
            default: false,
        },

        // ── Timestamps de estado ─────────────────────────────────────────────
        confirmedAt: { type: Date, default: null },
        preparedAt:  { type: Date, default: null },
        pickedUpAt:  { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Índices
deliverySchema.index({ userId: 1, createdAt: -1 });
deliverySchema.index({ restaurantId: 1, status: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('DeliveryOrder', deliverySchema);