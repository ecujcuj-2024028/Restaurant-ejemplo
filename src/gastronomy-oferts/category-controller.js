'use strict';

import Category from '../gastronomy-oferts/category-model.js';

export const getCategories = async (req, res) => {
    try {
        const filter = {};
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';

        const categories = await Category.find(filter).sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category)
            return res.status(404).json({
                success: false,
                message: `Categoría no encontrada con id ${req.params.id}`
            });

        return res.status(200).json({
            success: true,
            category
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createCategory = async (req, res) => {
    try {
        const data = req.body;

        const category = await Category.create({ ...data });

        return res.status(201).json({
            success: true,
            category
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!category)
            return res.status(404).json({
                success: false,
                message: `Categoría no encontrada con id ${req.params.id}`
            });

        return res.status(200).json({
            success: true,
            category
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category)
            return res.status(404).json({
                success: false,
                message: `Categoría no encontrada con id ${req.params.id}`
            });

        return res.status(200).json({
            success: true,
            message: 'Categoría eliminada correctamente'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};