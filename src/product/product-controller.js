'use strict';

import Product from './products-model.js';
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
