'use strict';

import Product from './products-model.js';
import Restaurant from '../restaurants/restaurant.model.js';
import { cloudinary, extractPublicId } from '../../middlewares/restaurant-uploader.js';
import { InventoryItem } from '../inventory/inventory.model.js';

/* ─────────────────────────────────────────────────────────────────────────────
Sincronizar producto de MongoDB → InventoryItem en Postgres
───────────────────────────────────────────────────────────────────────────── */
const syncProductToInventoryPg = async (product, restaurantId) => {
    try {
        // Verificar que no exista ya una entrada con este MongoProductId
        const existing = await InventoryItem.findOne({
            where: { MongoProductId: product._id.toString() },
        });

        if (existing) return;

        await InventoryItem.create({
            RestaurantId: restaurantId.toString(),
            MongoProductId: product._id.toString(),
            Name: product.name,
            Quantity: 0,
            Unit: 'unidades',
            CostPerUnit: 0.00,
            MinStock: 5,
            IsActive: true,
        });

        console.log(`Producto "${product.name}" sincronizado a inventory_items`);
    } catch (err) {
        console.error('sincronizando producto a Postgres:', err.message);
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /products  — Crear producto
───────────────────────────────────────────────────────────────────────────── */
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, type, category, restaurant, preparationTime } = req.body;

        let ingredients = req.body.ingredients;
        if (typeof ingredients === 'string') {
            try { ingredients = JSON.parse(ingredients); } catch { ingredients = []; }
        }

        const product = await Product.create({
            name,
            description,
            price,
            type,
            category,
            restaurant,
            ingredients: ingredients || [],
            preparationTime: preparationTime || null,
            image: req.file ? req.file.path : null,
        });

        // Sincronizar en background (no bloquea la respuesta)
        if (restaurant) {
            syncProductToInventoryPg(product, restaurant);
        }

        return res.status(201).json({ success: true, product });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /products  — Listar productos
───────────────────────────────────────────────────────────────────────────── */
export const getProducts = async (req, res) => {
    try {
        const { type, category, isAvailable, restaurant } = req.query;
        const filter = { isActive: true };

        if (type) filter.type = type;
        if (category) filter.category = category;
        if (restaurant) filter.restaurant = restaurant;
        if (isAvailable !== undefined)
            filter.isAvailable = isAvailable === 'true';

        const products = await Product.find(filter)
            .populate('category', 'name')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /products/:id  — Obtener producto
───────────────────────────────────────────────────────────────────────────── */
export const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name description')
            .populate('restaurant', 'name');

        if (!product)
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });

        return res.status(200).json({ success: true, product });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /products/:id  — Actualizar producto
───────────────────────────────────────────────────────────────────────────── */
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (req.file) {
            const existing = await Product.findById(id, 'image');
            if (existing?.image) {
                const publicId = extractPublicId(existing.image);
                if (publicId) await cloudinary.uploader.destroy(publicId);
            }
            updateData.image = req.file.path;
        }

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

        //Si cambió el nombre, sincronizar en Postgres
        if (updateData.name && product) {
            InventoryItem.update(
                { Name: updateData.name },
                { where: { MongoProductId: id } }
            ).catch(err => console.error('Error actualizando nombre en Postgres:', err.message));
        }

        return res.status(200).json({ success: true, product });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /products/:id  — Desactivar producto
───────────────────────────────────────────────────────────────────────────── */
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await Product.findByIdAndUpdate(id, { isActive: false });

        //Desactivar también en Postgres
        InventoryItem.update(
            { IsActive: false },
            { where: { MongoProductId: id } }
        ).catch(err => console.error('Error desactivando en Postgres:', err.message));

        return res.status(200).json({ success: true, message: 'Producto desactivado' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /products/stats/:restaurantId
   Estadísticas de productos para el ADMIN_RESTAURANTE dueño del restaurante
───────────────────────────────────────────────────────────────────────────── */
export const getProductStats = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Verificar que el restaurante existe y pertenece al usuario autenticado
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant || !restaurant.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado.',
            });
        }

        // Solo el dueño del restaurante puede ver sus estadísticas
        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);
        const isAdminSistema = userRoles.includes('ADMIN_SISTEMA');

        if (!isAdminSistema && restaurant.ownerId !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver las estadísticas de este restaurante.',
            });
        }

        // Traer todos los productos del restaurante (activos e inactivos)
        const products = await Product.find({ restaurant: restaurantId })
            .populate('category', 'name');

        const total = products.length;
        const active = products.filter(p => p.isActive).length;
        const inactive = products.filter(p => !p.isActive).length;
        const available = products.filter(p => p.isActive && p.isAvailable).length;
        const unavailable = products.filter(p => p.isActive && !p.isAvailable).length;

        // Distribución por tipo (solo productos activos)
        const byType = products
            .filter(p => p.isActive)
            .reduce((acc, p) => {
                acc[p.type] = (acc[p.type] || 0) + 1;
                return acc;
            }, {});

        // Distribución por categoría (solo productos activos)
        const byCategory = products
            .filter(p => p.isActive && p.category)
            .reduce((acc, p) => {
                const categoryName = p.category?.name || 'Sin categoría';
                acc[categoryName] = (acc[categoryName] || 0) + 1;
                return acc;
            }, {});

        return res.status(200).json({
            success: true,
            restaurantId,
            restaurantName: restaurant.name,
            stats: {
                total,
                active,
                inactive,
                available,
                unavailable,
                byType,
                byCategory,
            },
        });

    } catch (error) {
        console.error('[ProductController] getProductStats:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};