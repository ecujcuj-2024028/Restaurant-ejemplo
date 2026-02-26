'use strict';

import mongoose from "mongoose";

const additionalResourceSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del recurso es requerido"],
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: null
        },

        cost: {
            type: Number,
            min: [0, "El costo no puede ser negativo"],
            default: 0
        },

        quantity: {
            type: Number,
            min: [1, "La cantidad debe ser al menos 1"],
            default: 1
        }
    },
    {
        _id: false
    }
);

const eventSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre del evento es requerido"],
            trim: true,
            maxlength: [100, "El nombre no puede exceder 100 caracteres"]
        },

        description: {
            type: String,
            trim: true,
            maxlength: [1000, "La descripción no puede exceder 1000 caracteres"]
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "El restaurante es requerido"]
        },

        startDate: {
            type: Date,
            required: [true, "La fecha de inicio es requerida"]
        },

        endDate: {
            type: Date,
            required: [true, "La fecha de fin es requerida"],
            validate: {
                validator: function (v) {
                    return v > this.startDate;
                },
                message: "La fecha de fin debe ser posterior a la fecha de inicio"
            }
        },

        capacity: {
            type: Number,
            min: [1, "La capacidad debe ser al menos 1"],
            default: null
        },

        price: {
            type: Number,
            min: [0, "El precio no puede ser negativo"],
            default: 0
        },

        additionalResources: {
            type: [additionalResourceSchema],
            default: []
        },

        featuredProducts: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product"
                }
            ],
            default: []
        },

        image: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["scheduled", "ongoing", "completed", "cancelled"],
            default: "scheduled"
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

export default mongoose.models.Event || mongoose.model('Event', eventSchema);