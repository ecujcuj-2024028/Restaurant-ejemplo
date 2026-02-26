'use strict';

import Reservation from './reservation.model.js';
import Table       from '../tables/table.model.js';
import { sendReservationConfirmationEmail } from '../../helpers/email-service.js';
import { findUserById } from '../../helpers/user-db.js';

/* ─────────────────────────────────────────────────────────────────────────────
  Helper: paginación
───────────────────────────────────────────────────────────────────────────── */
const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
};

const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages : Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
});

/* ─────────────────────────────────────────────────────────────────────────────
  POST /reservations  — Crear reserva (sin sesiones, compatible con standalone)
───────────────────────────────────────────────────────────────────────────── */
export const createReservation = async (req, res) => {
    try {
        const { tableId, restaurantId, date, time, guestCount, notes } = req.body;
        const userId = req.user?.Id?.toString() || req.user?.id?.toString();

        /* ── 1. Validaciones de presencia ── */
        if (!tableId || !restaurantId || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Los campos tableId, restaurantId, date y time son obligatorios.',
            });
        }

        /* ── 2. Verificar que la mesa existe y pertenece al restaurante ── */
        const table = await Table.findOne({
            _id       : tableId,
            restaurant: restaurantId,
            isActive  : true,
        });

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'La mesa no existe, no pertenece al restaurante indicado o está inactiva.',
            });
        }

        /* ── 3. Verificar disponibilidad ── */
        if (table.availability !== 'disponible') {
            const estadoMsg = {
                ocupado  : 'La mesa ya se encuentra ocupada en este momento.',
                reservado: 'La mesa ya tiene una reserva activa. Por favor elige otra mesa o un horario diferente.',
            };
            return res.status(400).json({
                success: false,
                message: estadoMsg[table.availability] ?? `La mesa no está disponible (estado: ${table.availability}).`,
                table  : {
                    _id         : table._id,
                    number      : table.number,
                    availability: table.availability,
                    capacity    : table.capacity,
                    location    : table.location,
                },
            });
        }

        /* ── 4. Verificar capacidad ── */
        if (guestCount && guestCount > table.capacity) {
            return res.status(400).json({
                success: false,
                message: `La mesa #${table.number} tiene capacidad para ${table.capacity} comensales, pero se solicitaron ${guestCount}.`,
            });
        }

        /* ── 5. Verificar conflicto de horario ── */
        const conflicto = await Reservation.findOne({
            tableId,
            date,
            time,
            status: { $in: ['pendiente', 'confirmada'] },
        });

        if (conflicto) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una reserva ${conflicto.status} para la mesa #${table.number} el ${date} a las ${time}.`,
            });
        }

        /* ── 6. Crear la reserva ── */
        const reservation = await Reservation.create({
            tableId,
            userId,
            restaurantId,
            date,
            time,
            status    : 'confirmada',
            guestCount: guestCount || undefined,
            notes     : notes      || undefined,
        });

        /* ── 7. Actualizar estado de la mesa a 'reservado' ── */
        await Table.findByIdAndUpdate(tableId, { availability: 'reservado' });

        /* ── 8. GT-03: Email de confirmación al cliente (background) ── */
        try {
            const pgUser = await findUserById(userId);
            if (pgUser) {
                const populated = await Reservation.findById(reservation._id)
                    .populate('restaurantId', 'name');

                sendReservationConfirmationEmail({
                    customerEmail : pgUser.Email,
                    customerName  : `${pgUser.Name} ${pgUser.Surname}`,
                    restaurantName: populated.restaurantId?.name || `Restaurante (${restaurantId})`,
                    tableNumber   : table.number,
                    tableLocation : table.location,
                    date,
                    time,
                    guestCount    : guestCount || null,
                    reservationId : reservation._id.toString(),
                }).catch(err => console.error('[Reservation] Error enviando email:', err.message));
            }
        } catch (emailErr) {
            console.error('[Reservation] Error al obtener datos para email:', emailErr.message);
        }

        /* ── 9. Retornar respuesta ── */
        const populated = await Reservation.findById(reservation._id)
            .populate('tableId',      'number capacity location availability')
            .populate('restaurantId', 'name address');

        return res.status(201).json({
            success    : true,
            message    : `Reserva confirmada para la mesa #${table.number} el ${date} a las ${time}.`,
            reservation: populated,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Conflicto: ya existe una reserva para esa mesa en el mismo horario.',
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Error interno al crear la reserva.',
            error  : error.message,
        });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /reservations  — Reservas del usuario autenticado
───────────────────────────────────────────────────────────────────────────── */
export const getMyReservations = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString() || req.user?.id?.toString();
        const { status, date } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { userId };
        if (status) filter.status = status;
        if (date)   filter.date   = date;

        const [total, reservations] = await Promise.all([
            Reservation.countDocuments(filter),
            Reservation.find(filter)
                .populate('tableId',      'number capacity location availability')
                .populate('restaurantId', 'name address')
                .sort({ date: -1, time: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success    : true,
            pagination : buildPaginationMeta(page, limit, total),
            reservations,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /reservations/restaurant/:restaurantId  — Reservas de un restaurante
───────────────────────────────────────────────────────────────────────────── */
export const getReservationsByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { status, date } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { restaurantId };
        if (status) filter.status = status;
        if (date)   filter.date   = date;

        const [total, reservations] = await Promise.all([
            Reservation.countDocuments(filter),
            Reservation.find(filter)
                .populate('tableId',      'number capacity location availability')
                .populate('restaurantId', 'name address')
                .sort({ date: -1, time: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success    : true,
            pagination : buildPaginationMeta(page, limit, total),
            reservations,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /reservations/:id/cancel  — Cancelar reserva y liberar mesa
───────────────────────────────────────────────────────────────────────────── */
export const cancelReservation = async (req, res) => {
    try {
        const userId = req.user?.Id?.toString() || req.user?.id?.toString();
        const { id } = req.params;

        const reservation = await Reservation.findById(id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
        }

        if (reservation.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta reserva.',
            });
        }

        if (reservation.status === 'cancelada') {
            return res.status(400).json({ success: false, message: 'La reserva ya está cancelada.' });
        }

        reservation.status = 'cancelada';
        await reservation.save();

        await Table.findByIdAndUpdate(reservation.tableId, { availability: 'disponible' });

        const populated = await Reservation.findById(reservation._id)
            .populate('tableId',      'number capacity location availability')
            .populate('restaurantId', 'name address');

        return res.status(200).json({
            success    : true,
            message    : 'Reserva cancelada y mesa liberada correctamente.',
            reservation: populated,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};