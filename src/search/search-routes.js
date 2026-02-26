'use strict';

import { Router } from 'express';
import {
    globalSearch,
    searchRestaurants,
    searchProducts,
} from './search-controller.js';

const router = Router();

/**
 * @route   GET /api/v1/search
 * @desc    Búsqueda global (restaurantes + productos) con $regex y filtros
 * @access  Public
 * @query   q, minPrice, maxPrice, category, minRating, page, limit
 */
router.get('/', globalSearch);

/**
 * @route   GET /api/v1/search/restaurants
 * @desc    Buscar solo restaurantes
 * @access  Public
 * @query   name, category, city, minRating, availability, page, limit
 *          availability=true → solo restaurantes con mesas disponibles ahora
 */
router.get('/restaurants', searchRestaurants);

/**
 * @route   GET /api/v1/search/products
 * @desc    Buscar solo productos/platos
 * @access  Public
 * @query   name, type, category, restaurant, minPrice, maxPrice, page, limit
 */
router.get('/products', searchProducts);

export default router;