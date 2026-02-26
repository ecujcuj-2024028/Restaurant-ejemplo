'use strict';

import { Router } from 'express';
import {
    createInventoryItemPg,
    getInventoryByRestaurant,
    updateQuantity,
    updateInventoryItem,
    deleteInventoryItem,
} from './inventory.controller.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();

/**
 * @route   POST /inventory-pg
 * @desc    Crea un ítem de inventario con datos financieros en PostgreSQL
 * @access  ADMIN_RESTAURANTE | ADMIN_SISTEMA
 */
router.post(
    '/',
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    createInventoryItemPg
);

/**
 * @route   GET /inventory-pg/:restaurantId
 * @desc    Lista el inventario de un restaurante
 * @query   ?lowStock=true → solo ítems bajo el umbral mínimo
 * @access  ADMIN_RESTAURANTE | ADMIN_SISTEMA
 */
router.get(
    '/:restaurantId',
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    getInventoryByRestaurant
);

/**
 * @route   PATCH /inventory-pg/:id/quantity
 * @desc    Actualiza la cantidad (set | add | subtract)
 * @body    { quantity: Number, operation?: 'set'|'add'|'subtract' }
 * @access  ADMIN_RESTAURANTE | ADMIN_SISTEMA
 */
router.patch(
    '/:id/quantity',
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    updateQuantity
);

/**
 * @route   PUT /inventory-pg/:id
 * @desc    Actualiza todos los campos del ítem (nombre, costo, stock mínimo, etc.)
 * @access  ADMIN_RESTAURANTE | ADMIN_SISTEMA
 */
router.put(
    '/:id',
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    updateInventoryItem
);

/**
 * @route   DELETE /inventory-pg/:id
 * @desc    Eliminación lógica de un ítem de inventario
 * @access  ADMIN_RESTAURANTE | ADMIN_SISTEMA
 */
router.delete(
    '/:id',
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    deleteInventoryItem
);

export default router;
