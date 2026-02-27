'use strict';

import mongoose from "mongoose";

const categorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre de la categoría es requerido"],
            trim: true,
            unique: true,
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

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.GastronomyCategory || mongoose.model('GastronomyCategory', categorySchema);