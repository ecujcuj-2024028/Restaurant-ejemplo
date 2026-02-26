'use strict';

import Table from '../Tables/table.model.js';

export const createTable = async (req, res) => {
    try {
        const data = req.body;

        const table = await Table.create(data);

        return res.status(201).json({
            success: true,
            table
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getTables = async (req, res) => {
    try {
        const tables = await Table.find().populate('restaurant');

        return res.status(200).json({
            success: true,
            tables
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching tables',
            error: error.message
        });
    }
};

export const getTablesByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const tables = await Table.find({
            restaurant: restaurantId,
            isActive: true
        }).populate('restaurant');

        return res.status(200).json({
            success: true,
            tables
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching tables',
            error: error.message
        });
    }
};

export const updateTableStatus = async (req, res) => {
    try {
        const { tableId } = req.params;
        const { availability } = req.body;

        const validStatus = ['disponible', 'ocupado', 'reservado'];

        if (!validStatus.includes(availability)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const updatedTable = await Table.findByIdAndUpdate(
            tableId,
            { availability },
            { new: true }
        );

        if (!updatedTable) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Estado actualizado correctamente',
            table: updatedTable
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating table status',
            error: error.message
        });
    }
};