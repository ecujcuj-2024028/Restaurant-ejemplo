'use strict';

import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        // Referencia al usuario que dejó la reseña 
        usuarioId: {
            type: String,
            required: [true, 'El ID de usuario es obligatorio'],
            trim: true
        },
        // Referencia al restaurante 
        restauranteId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'El ID del restaurante es obligatorio'],
            ref: 'Restaurant'
        },
        // Referencia al plato 
        platoId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'El ID del plato es obligatorio'],
            ref: 'MenuItem'
        },
        // Calificación del 1 al 5
        rating: {
            type: Number,
            required: [true, 'El rating es obligatorio'],
            min: [1, 'El rating mínimo es 1'],
            max: [5, 'El rating máximo es 5'],
            validate: {
                validator: Number.isInteger,
                message: 'El rating debe ser un número entero'
            }
        },
        // Comentario de la reseña
        comentario: {
            type: String,
            required: [true, 'El comentario es obligatorio'],
            trim: true,
            minlength: [10, 'El comentario debe tener al menos 10 caracteres'],
            maxlength: [500, 'El comentario no puede superar los 500 caracteres']
        },
        // Estado de la reseña 
        estado: {
            type: String,
            enum: ['activa', 'moderada', 'eliminada'],
            default: 'activa'
        },
        // Datos del consumo que origina la reseña
        consumo: {
            fecha: {
                type: Date,
                default: Date.now
            },
            montoTotal: {
                type: Number,
                min: [0, 'El monto no puede ser negativo']
            }
        }
    },
    {
        timestamps: true,     
        versionKey: false     
    }
);

// Índices para consultas frecuentes de agregación
reviewSchema.index({ platoId: 1 });
reviewSchema.index({ restauranteId: 1 });
reviewSchema.index({ usuarioId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

//  un usuario puede reseñar el mismo plato varias veces
reviewSchema.index({ usuarioId: 1, platoId: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);