'use strict'
import mongoose from "mongoose";

const orderDetailSchema = new mongoose.Schema({
    orden: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    plato: {
        type: String,
        required: true
    },
    cantidad: {
        type: Number,
        required: true
    },
    precioUnitario: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number
    }
}, { timestamps: true });

// Calcular subtotal automáticamente
orderDetailSchema.pre('save', function(next) {
    this.subtotal = this.cantidad * this.precioUnitario;
    next();
});

export default mongoose.model('OrderDetail', orderDetailSchema);