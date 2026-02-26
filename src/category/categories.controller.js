'use strict';

import Category from './categories.model.js';

/* Listar categorías */
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .populate({
                path: 'restaurantId',
                select: 'name',
                options: { strictPopulate: false }
            });

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

/* Obtener categoría por ID */
export const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('restaurantId', 'name');

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

/* Crear categoría */
export const createCategory = async (req, res) => {
    try {
        const { name, description, image, restaurantId } = req.body;

        /* Validar nombre único por restaurante */
        const exists = await Category.findOne({ name, restaurantId });

        if (exists)
            return res.status(409).json({
                success: false,
                message: `Ya existe una categoría con el nombre "${name}" en este restaurante`
            });

        const category = await Category.create({
            name,
            description,
            image: req.file ? req.file.path : image || null,
            restaurantId
        });

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

/* Actualizar categoría */
export const updateCategory = async (req, res) => {
    try {
        const { name, restaurantId } = req.body;

        /* Si cambia el nombre, validar que no duplique en el mismo restaurante */
        if (name && restaurantId) {
            const exists = await Category.findOne({
                name,
                restaurantId,
                _id: { $ne: req.params.id }
            });

            if (exists)
                return res.status(409).json({
                    success: false,
                    message: `Ya existe una categoría con el nombre "${name}" en este restaurante`
                });
        }

        const updateData = { ...req.body };
        if (req.file) {
            updateData.image = req.file.path; // URL de Cloudinary
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
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

/* Eliminación lógica */
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category)
            return res.status(404).json({
                success: false,
                message: `Categoría no encontrada con id ${req.params.id}`
            });

        await Category.findByIdAndUpdate(req.params.id, { isActive: false });

        return res.status(200).json({
            success: true,
            message: 'Categoría desactivada'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};