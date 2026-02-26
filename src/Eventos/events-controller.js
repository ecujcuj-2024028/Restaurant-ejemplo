'use strict';

import Event from '../Eventos/events-model.js';
import Table from '../tables/table.model.js';
import Product from '../product/products-model.js';
import { checkAndUpdateEventStatus, checkAndUpdateMultipleEventStatuses } from '../../helpers/event-helpers.js';

export const getEvents = async (req, res) => {
    try {
        const { status, restaurant } = req.query;
        const filter = { isActive: true };

        if (status)     filter.status     = status;
        if (restaurant) filter.restaurant = restaurant;

        let events = await Event.find(filter)
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image')
            .sort({ startDate: 1 });

        // Actualizar estados automáticamente basándose en fechas
        events = await checkAndUpdateMultipleEventStatuses(events);

        return res.status(200).json({
            success: true,
            count: events.length,
            events
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id)
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name description price image type');

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        // Actualizar estado automáticamente
        event = await checkAndUpdateEventStatus(req.params.id);

        return res.status(200).json({
            success: true,
            event
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createEvent = async (req, res) => {
    try {
        const data = req.body;

        // Validación de capacidad del evento vs capacidad total del restaurante
        if (data.capacity) {
            const tables = await Table.find({
                restaurant: req.user.restaurant,
                isActive: true
            });

            const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

            if (data.capacity > totalCapacity) {
                return res.status(400).json({
                    success: false,
                    message: `La capacidad del evento (${data.capacity}) supera el aforo del restaurante (${totalCapacity})`
                });
            }
        }

        // Validación de productos destacados
        if (data.featuredProducts && data.featuredProducts.length > 0) {
            const productIds = data.featuredProducts;
            const products = await Product.find({
                _id: { $in: productIds },
                restaurant: req.user.restaurant,
                isActive: true
            });

            if (products.length !== productIds.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Uno o más productos no existen o no pertenecen a tu restaurante'
                });
            }
        }

        const event = await Event.create({
            ...data,
            restaurant: req.user.restaurant
        });

        const populatedEvent = await Event.findById(event._id)
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image');

        return res.status(201).json({
            success: true,
            event: populatedEvent
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        if (req.user.role !== 'admin' &&
            event.restaurant.toString() !== req.user.restaurant.toString())
            return res.status(403).json({
                success: false,
                message: 'No autorizado para actualizar este evento'
            });

        // Validación de capacidad si se está actualizando
        if (req.body.capacity) {
            const tables = await Table.find({
                restaurant: event.restaurant,
                isActive: true
            });

            const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

            if (req.body.capacity > totalCapacity) {
                return res.status(400).json({
                    success: false,
                    message: `La capacidad del evento (${req.body.capacity}) supera el aforo del restaurante (${totalCapacity})`
                });
            }
        }

        // Validación de productos destacados si se están actualizando
        if (req.body.featuredProducts && req.body.featuredProducts.length > 0) {
            const productIds = req.body.featuredProducts;
            const products = await Product.find({
                _id: { $in: productIds },
                restaurant: event.restaurant,
                isActive: true
            });

            if (products.length !== productIds.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Uno o más productos no existen o no pertenecen al restaurante'
                });
            }
        }

        const updated = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image');

        return res.status(200).json({
            success: true,
            event: updated
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateEventStatus = async (req, res) => {
    try {
        const allowed = ['scheduled', 'ongoing', 'completed', 'cancelled'];

        if (!allowed.includes(req.body.status))
            return res.status(400).json({
                success: false,
                message: `Estado inválido. Valores permitidos: ${allowed.join(', ')}`
            });

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        )
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image');

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        return res.status(200).json({
            success: true,
            event
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        if (req.user.role !== 'admin' &&
            event.restaurant.toString() !== req.user.restaurant.toString())
            return res.status(403).json({
                success: false,
                message: 'No autorizado para eliminar este evento'
            });

        await Event.findByIdAndUpdate(
            req.params.id,
            { isActive: false, status: 'cancelled' }
        );

        return res.status(200).json({
            success: true,
            message: 'Evento cancelado correctamente'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Agregar producto destacado a un evento
 * POST /api/v1/events/:id/featured-products
 */
export const addFeaturedProduct = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        if (req.user.role !== 'admin' &&
            event.restaurant.toString() !== req.user.restaurant.toString())
            return res.status(403).json({
                success: false,
                message: 'No autorizado para modificar este evento'
            });

        const { productId } = req.body;

        // Validar que el producto existe y pertenece al mismo restaurante
        const product = await Product.findOne({
            _id: productId,
            restaurant: event.restaurant,
            isActive: true
        });

        if (!product)
            return res.status(404).json({
                success: false,
                message: 'El producto no existe o no pertenece al restaurante del evento'
            });

        // Verificar que no esté ya agregado
        if (event.featuredProducts.includes(productId))
            return res.status(400).json({
                success: false,
                message: 'El producto ya está en la lista de productos destacados'
            });

        event.featuredProducts.push(productId);
        await event.save();

        const updated = await Event.findById(event._id)
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image');

        return res.status(200).json({
            success: true,
            event: updated
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Eliminar producto destacado de un evento
 * DELETE /api/v1/events/:id/featured-products/:productId
 */
export const removeFeaturedProduct = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event)
            return res.status(404).json({
                success: false,
                message: `Evento no encontrado con id ${req.params.id}`
            });

        if (req.user.role !== 'admin' &&
            event.restaurant.toString() !== req.user.restaurant.toString())
            return res.status(403).json({
                success: false,
                message: 'No autorizado para modificar este evento'
            });

        const { productId } = req.params;

        event.featuredProducts = event.featuredProducts.filter(
            id => id.toString() !== productId
        );

        await event.save();

        const updated = await Event.findById(event._id)
            .populate('restaurant', 'name')
            .populate('featuredProducts', 'name price image');

        return res.status(200).json({
            success: true,
            event: updated
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};