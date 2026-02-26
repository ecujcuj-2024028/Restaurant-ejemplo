'use strict';

import mongoose from "mongoose";

const menuItemSchema = mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "El producto es requerido"]
        },

        displayOrder: {
            type: Number,
            default: 0
        },

        isHighlighted: {
            type: Boolean,
            default: false
        },

        specialPrice: {
            type: Number,
            min: [0, "El precio especial no puede ser negativo"],
            default: null
        }
    },
    {
        _id: false
    }
);

const menuSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del menú es requerido"],
            trim: true,
            maxlength: [100, "El nombre no puede exceder 100 caracteres"]
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, "La descripción no puede exceder 500 caracteres"]
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "El restaurante es requerido"]
        },

        menuType: {
            type: String,
            enum: ["breakfast", "lunch", "dinner", "all_day", "special"],
            default: "all_day"
        },

        items: {
            type: [menuItemSchema],
            default: []
        },

        validFrom: {
            type: Date,
            default: null
        },

        validTo: {
            type: Date,
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

export default mongoose.model('Menu', menuSchema);