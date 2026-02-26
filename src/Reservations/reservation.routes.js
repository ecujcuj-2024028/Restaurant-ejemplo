'use strict';

import { Router } from 'express';
import {
    createReservation,
    getMyReservations,
    getReservationsByRestaurant,
    cancelReservation,
} from './reservation.controller.js';

const router = Router();

/**
 * @route   POST /reservations
 * @desc    Crea una reserva verificando disponibilidad real de la mesa
 * @access  Privado (requiere JWT)
 * @body    { tableId, restaurantId, date, time, guestCount?, notes? }
 */
router.post('/', createReservation);

/**
 * @route   GET /reservations
 * @desc    Lista las reservas del usuario autenticado
 * @access  Privado
 * @query   status?, date?, page?, limit?
 */
router.get('/', getMyReservations);

/**
 * @route   GET /reservations/restaurant/:restaurantId
 * @desc    Lista todas las reservas de un restaurante
 * @access  Privado
 * @query   status?, date?, page?, limit?
 */
router.get('/restaurant/:restaurantId', getReservationsByRestaurant);

/**
 * @route   PATCH /reservations/:id/cancel
 * @desc    Cancela una reserva y libera la mesa
 * @access  Privado (solo el dueño de la reserva)
 */
router.patch('/:id/cancel', cancelReservation);

export default router;