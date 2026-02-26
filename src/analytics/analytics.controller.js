'use strict';

import { Review } from './review.model.js';
import Order from '../orders/order.model.js';
import mongoose from 'mongoose';

/* ─────────────────────────────────────────────
   POST /analytics/reviews — Publicar reseña
─────────────────────────────────────────────── */
export const crearReview = async (req, res) => {
    try {
        const { usuarioId, restauranteId, platoId, rating, comentario, consumo } = req.body;

        if (!usuarioId || !restauranteId || !platoId) {
            return res.status(400).json({
                success: false,
                message: 'Los campos usuarioId, restauranteId y platoId son obligatorios'
            });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'El rating debe ser entre 1 y 5' });
        }

        if (!comentario || comentario.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'El comentario debe tener al menos 10 caracteres' });
        }

        const nuevaReview = new Review({
            usuarioId: usuarioId.toString(),
            restauranteId: new mongoose.Types.ObjectId(restauranteId),
            platoId: new mongoose.Types.ObjectId(platoId),
            rating: Number(rating),
            comentario: comentario.trim(),
            estado: 'activa',
            consumo: consumo || {}
        });

        const reviewGuardada = await nuevaReview.save();

        return res.status(201).json({
            success: true,
            message: 'Reseña publicada exitosamente',
            data: reviewGuardada
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET /analytics/reviews/plato/:platoId
─────────────────────────────────────────────── */
export const getReviewsPorPlato = async (req, res) => {
    try {
        const { platoId } = req.params;

        const reviews = await Review.find({ 
            platoId: new mongoose.Types.ObjectId(platoId), 
            estado: 'activa' 
        }).sort({ createdAt: -1 }).lean();

        const totalReviews = reviews.length;
        const promedioRating = totalReviews > 0
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(2)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                platoId,
                totalReviews,
                promedioRating: parseFloat(promedioRating),
                reviews
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET /analytics/platos/mas-vendidos (MS20)
─────────────────────────────────────────────── */
export const getPlatosMasVendidos = async (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 10;
        const { restauranteId } = req.query;

        const matchStage = { status: { $ne: 'cancelado' } };
        if (restauranteId && mongoose.Types.ObjectId.isValid(restauranteId)) {
            matchStage.restaurantId = new mongoose.Types.ObjectId(restauranteId);
        }

        const resultado = await Order.aggregate([
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    nombrePlato: { $first: '$items.name' },
                    cantidadVendida: { $sum: '$items.quantity' },
                    ingresosGenerados: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { cantidadVendida: -1 } },
            { $limit: limite }
        ]);

        return res.status(200).json({
            success: true,
            message: `Top ${limite} platos con ventas reales`,
            data: resultado
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET /analytics/stats — Estadísticas Globales
─────────────────────────────────────────────── */
export const getStatsAdmin = async (req, res) => {
    try {
        const statsVentas = await Order.aggregate([
            { $match: { status: { $ne: 'cancelado' } } },
            {
                $group: {
                    _id: null,
                    totalIngresos: { $sum: '$total' },
                    totalPedidos: { $sum: 1 },
                    ticketPromedio: { $avg: '$total' }
                }
            }
        ]);

        const resumen = statsVentas[0] || { totalIngresos: 0, totalPedidos: 0, ticketPromedio: 0 };

        return res.status(200).json({
            success: true,
            message: 'Estadísticas globales de administración',
            data: {
                ingresosTotales: resumen.totalIngresos,
                pedidosTotales: resumen.totalPedidos,
                ticketPromedio: parseFloat(resumen.ticketPromedio.toFixed(2))
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET /analytics/stats/restaurant/:restaurantId
─────────────────────────────────────────────── */
export const getStatsByRestaurant = async (req, res) => {
    try {
        return res.status(501).json({
            success: false,
            message: "Función pendiente"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};