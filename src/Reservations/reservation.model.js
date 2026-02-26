'use strict';

import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
    {
        tableId: {
            type    : mongoose.Schema.Types.ObjectId,
            ref     : 'Table',
            required: [true, 'La mesa es requerida'],
        },

        userId: {
            type    : String,                          // ID de PostgreSQL (JWT sub)
            required: [true, 'El usuario es requerido'],
            trim    : true,
        },

        restaurantId: {
            type    : mongoose.Schema.Types.ObjectId,
            ref     : 'Restaurant',
            required: [true, 'El restaurante es requerido'],
        },

        date: {
            type    : String,                          // ISO: YYYY-MM-DD
            required: [true, 'La fecha de la reserva es requerida'],
            match   : [/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'],
        },

        time: {
            type    : String,                          // 24 h: HH:MM
            required: [true, 'La hora de la reserva es requerida'],
            match   : [/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM (24 h)'],
        },

        status: {
            type   : String,
            enum   : {
                values : ['pendiente', 'confirmada', 'cancelada'],
                message: 'El estado debe ser: pendiente, confirmada o cancelada',
            },
            default: 'pendiente',
        },

        guestCount: {
            type: Number,
            min : [1, 'Debe haber al menos 1 comensal'],
        },

        notes: {
            type     : String,
            trim     : true,
            maxlength: [300, 'Las notas no pueden superar 300 caracteres'],
        },
    },
    {
        timestamps: true,
    }
);

/* ── Índice compuesto: evita doble reserva de la misma mesa en mismo turno ── */
reservationSchema.index(
    { tableId: 1, date: 1, time: 1 },
    {
        unique               : true,
        partialFilterExpression: { status: { $in: ['pendiente', 'confirmada'] } },
    }
);

/* ── Índice para consultas por usuario ── */
reservationSchema.index({ userId: 1, date: -1 });

export default mongoose.model('Reservation', reservationSchema);