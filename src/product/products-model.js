'use strict';

import mongoose from "mongoose";

const ingredientSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del ingrediente es requerido"],
            trim: true
        },

        quantity: {
            type: String,
            required: [true, "La cantidad es requerida"],
            trim: true
        },

        unit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "unidades"],
            default: "unidades"
        },

        isAllergen: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: false
    }
);

const productSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del producto es requerido"],
            trim: true,
            maxlength: [100, "El nombre no puede exceder 100 caracteres"]
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, "La descripción no puede exceder 500 caracteres"]
        },

        price: {
            type: Number,
            required: [true, "El precio es requerido"],
            min: [0, "El precio debe ser un número positivo"]
        },

        type: {
            type: String,
            enum: ["starter", " ", "dessert", "beverage", "side_dish", "combo"],
            required: [true, "El tipo de producto es requerido"]
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "La categoría es requerida"]
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "El restaurante es requerido"]
        },

        ingredients: {
            type: [ingredientSchema],
            default: []
        },

        image: {
            type: String,
            default: null
        },

        preparationTime: {
            type: Number,
            min: [1, "El tiempo de preparación debe ser al menos 1 minuto"],
            default: null
        },

        isAvailable: {
            type: Boolean,
            default: true
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

productSchema.index({ name: 1, restaurant: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);