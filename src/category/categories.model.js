'use strict';

import mongoose from "mongoose";

const categorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre de la categoría es requerido"],
            trim: true,
            maxlength: [60, "El nombre no puede exceder 60 caracteres"]
        },

        description: {
            type: String,
            trim: true,
            maxlength: [255, "La descripción no puede exceder 255 caracteres"]
        },

        image: {
            type: String,
            default: null
        },

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "El restaurante es requerido"]
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

/* Nombre único por restaurante */
categorySchema.index({ name: 1, restaurantId: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model('Category', categorySchema);