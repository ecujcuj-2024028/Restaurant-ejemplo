'use strict';

import mongoose from "mongoose";

const restaurantSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del restaurante es requerido"],
            trim: true
        },

        address: {
            street: {
                type: String,
                required: [true, 'La calle es requerida']
            },
            city: {
                type: String,
                required: [true, 'La ciudad es requerida']
            },
            country: {
                type: String,
                required: [true, 'El pais es requerido']
            }
        },

        category: {
            type: String,
            required: [true, "La categoría es requerida"],
            enum: ["Comida rapida", "Italiana", "Mexicana", "Asiatica", "Other"]
        },

        ownerId: {
            type: String,
            required: [true, "El ID del dueño es obligatorio"]
        },

        photos: [
            {
                type: String
            }
        ],

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

/* Relación virtual con tables */
restaurantSchema.virtual('tables', {
    ref: 'Table',
    localField: '_id',
    foreignField: 'restaurant'
});

/* Permite devolver virtuals en JSON */
restaurantSchema.set('toJSON', { virtuals: true });
restaurantSchema.set('toObject', { virtuals: true });

export default mongoose.model('Restaurant', restaurantSchema);
