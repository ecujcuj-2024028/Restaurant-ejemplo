'use strict';

import Event from '../src/Eventos/events-model.js';

/**
 * Verifica y actualiza el estado de un evento basado en las fechas
 * @param {String} eventId - ID del evento a verificar
 * @returns {Object} Evento actualizado
 */
export const checkAndUpdateEventStatus = async (eventId) => {
    try {
        const event = await Event.findById(eventId);
        
        if (!event || event.status === 'cancelled') {
            return event;
        }

        const now = new Date();
        let newStatus = event.status;

        // Si la fecha actual está entre startDate y endDate → ongoing
        if (now >= event.startDate && now <= event.endDate) {
            newStatus = 'ongoing';
        }
        // Si la fecha actual es posterior a endDate → completed
        else if (now > event.endDate) {
            newStatus = 'completed';
        }
        // Si la fecha actual es anterior a startDate → scheduled
        else if (now < event.startDate) {
            newStatus = 'scheduled';
        }

        // Solo actualizar si el estado cambió
        if (newStatus !== event.status) {
            event.status = newStatus;
            await event.save();
        }

        return event;

    } catch (error) {
        throw new Error(`Error actualizando estado del evento: ${error.message}`);
    }
};

/**
 * Actualiza el estado de múltiples eventos
 * @param {Array} events - Array de eventos a actualizar
 * @returns {Array} Eventos con estados actualizados
 */
export const checkAndUpdateMultipleEventStatuses = async (events) => {
    try {
        const now = new Date();
        const updatedEvents = [];

        for (const event of events) {
            if (event.status === 'cancelled') {
                updatedEvents.push(event);
                continue;
            }

            let newStatus = event.status;

            if (now >= event.startDate && now <= event.endDate) {
                newStatus = 'ongoing';
            } else if (now > event.endDate) {
                newStatus = 'completed';
            } else if (now < event.startDate) {
                newStatus = 'scheduled';
            }

            if (newStatus !== event.status) {
                event.status = newStatus;
                await event.save();
            }

            updatedEvents.push(event);
        }

        return updatedEvents;

    } catch (error) {
        throw new Error(`Error actualizando estados de eventos: ${error.message}`);
    }
};