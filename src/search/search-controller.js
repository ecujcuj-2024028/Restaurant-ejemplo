'use strict';

import Restaurant from '../restaurants/restaurant.model.js';
import Category   from '../gastronomy-oferts/category-model.js';
import Product    from '../product/products-model.js';
import Table      from '../tables/table.model.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip  = (page - 1) * limit;
    return { page, limit, skip };
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
   GET /search?q=&minPrice=&maxPrice=&category=&minRating=&page=&limit=
   Búsqueda global sobre Restaurantes y Productos con $regex + filtros
───────────────────────────────────────────────────────────────────────────── */
export const globalSearch = async (req, res) => {
    try {
        const { q, minPrice, maxPrice, category, minRating } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro "q" debe tener al menos 2 caracteres.',
            });
        }

        const { page, limit, skip } = getPagination(req.query);
        const regex = { $regex: q.trim(), $options: 'i' };

        /* ── Filtro Restaurantes ── */
        const restaurantFilter = { name: regex, isActive: true };
        if (minRating) restaurantFilter.rating = { $gte: parseFloat(minRating) };

        /* ── Filtro Productos ── */
        const productFilter = { name: regex, isActive: true, isAvailable: true };
        if (minPrice || maxPrice) {
            productFilter.price = {};
            if (minPrice) productFilter.price.$gte = parseFloat(minPrice);
            if (maxPrice) productFilter.price.$lte = parseFloat(maxPrice);
        }

        /* ── Filtro por categoría (aplica a ambas colecciones) ── */
        if (category) {
            const cats = await Category.find({
                name    : { $regex: category, $options: 'i' },
                isActive: true,
            }).select('_id');

            const catIds = cats.map((c) => c._id);
            restaurantFilter.categories = { $in: catIds };
            productFilter.category      = { $in: catIds };
        }

        /* ── Consultas paralelas ── */
        const [restaurantsTotal, productsTotal, restaurants, products] = await Promise.all([
            Restaurant.countDocuments(restaurantFilter),
            Product.countDocuments(productFilter),

            Restaurant.find(restaurantFilter)
                .populate('categories', 'name image')
                .select('name description address rating categories image isActive')
                .sort({ rating: -1 })
                .skip(skip)
                .limit(limit),

            Product.find(productFilter)
                .populate('category',   'name image')
                .populate('restaurant', 'name address')
                .select('name description price type category restaurant image preparationTime isAvailable')
                .sort({ price: 1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success: true,
            query  : q.trim(),
            filters: {
                ...(minPrice  && { minPrice : parseFloat(minPrice)  }),
                ...(maxPrice  && { maxPrice : parseFloat(maxPrice)  }),
                ...(category  && { category                         }),
                ...(minRating && { minRating: parseFloat(minRating) }),
            },
            data: {
                restaurants: {
                    pagination: buildPaginationMeta(page, limit, restaurantsTotal),
                    results   : restaurants,
                },
                products: {
                    pagination: buildPaginationMeta(page, limit, productsTotal),
                    results   : products,
                },
            },
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /search/restaurants?name=&category=&city=&minRating=&availability=&page=&limit=
   availability: true → solo restaurantes con al menos una mesa en estado "disponible"
───────────────────────────────────────────────────────────────────────────── */
export const searchRestaurants = async (req, res) => {
    try {
        const { name, category, city, minRating, availability } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { isActive: true };
        if (name)      filter.name            = { $regex: name, $options: 'i' };
        if (city)      filter['address.city'] = { $regex: city, $options: 'i' };
        if (minRating) filter.rating          = { $gte: parseFloat(minRating) };

        if (category) {
            const cats = await Category.find({
                name    : { $regex: category, $options: 'i' },
                isActive: true,
            }).select('_id');

            if (cats.length === 0) {
                return res.status(200).json({
                    success    : true,
                    filters    : { availability: availability ?? null },
                    pagination : buildPaginationMeta(page, limit, 0),
                    restaurants: [],
                });
            }
            filter.categories = { $in: cats.map((c) => c._id) };
        }

        // filtro para disponibilidad, solo si hay mesas disponibles
        if (availability === 'true' || availability === '1') {
            const tablesWithAvailability = await Table.find({
                availability: 'disponible',
                isActive    : true,
            }).distinct('restaurant');

            // Si no hay ninguna mesa disponible en ningún restaurante no devuleve nada
            if (tablesWithAvailability.length === 0) {
                return res.status(200).json({
                    success    : true,
                    filters    : { availability: true },
                    pagination : buildPaginationMeta(page, limit, 0),
                    restaurants: [],
                });
            }
            filter._id = { $in: tablesWithAvailability };
        }

        const [total, restaurants] = await Promise.all([
            Restaurant.countDocuments(filter),
            Restaurant.find(filter)
                .populate('categories', 'name image')
                .select('name description address rating categories image')
                .sort({ rating: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success    : true,
            filters    : {
                ...(name        && { name                                         }),
                ...(city        && { city                                         }),
                ...(minRating   && { minRating  : parseFloat(minRating)           }),
                ...(category    && { category                                     }),
                ...(availability !== undefined && { availability: availability === 'true' || availability === '1' }),
            },
            pagination : buildPaginationMeta(page, limit, total),
            restaurants,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /search/products?name=&type=&category=&restaurant=
                        &minPrice=&maxPrice=&page=&limit=
───────────────────────────────────────────────────────────────────────────── */
export const searchProducts = async (req, res) => {
    try {
        const { name, type, category, restaurant, minPrice, maxPrice } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter = { isActive: true, isAvailable: true };
        if (name)       filter.name       = { $regex: name, $options: 'i' };
        if (type)       filter.type       = type;
        if (category)   filter.category   = category;
        if (restaurant) filter.restaurant = restaurant;

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        const [total, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate('category',   'name')
                .populate('restaurant', 'name')
                .select('name description price type category restaurant image preparationTime')
                .sort({ price: 1 })
                .skip(skip)
                .limit(limit),
        ]);

        return res.status(200).json({
            success   : true,
            pagination: buildPaginationMeta(page, limit, total),
            products,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};