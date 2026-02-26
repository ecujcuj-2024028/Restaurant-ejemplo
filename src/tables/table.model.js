'use strict';

import mongoose from "mongoose";

const tableSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "El restaurante es requerido"]
        },

        number: {
            type: Number,
            required: [true, "El número de mesa es requerido"]
        },

        capacity: {
            type: Number,
            required: [true, "La capacidad de la mesa es requerida"]
        },

        location: {
            type: String,
            enum: [
                "interior",
                "exterior",
                "terraza",
                "vip"
            ],
            default: "interior"
        },

        availability: {
            type: String,
            enum: [
                "disponible",
                "ocupado",
                "reservado",
            ],
            default: "disponible"
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


export default mongoose.models.Table || mongoose.model('Table', tableSchema);