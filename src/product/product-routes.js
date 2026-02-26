'use strict';

import { Router } from 'express';
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} from '../product/product-controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';
import { uploadProductImage } from '../../middlewares/restaurant-uploader.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProduct);

router.post(
    '/',
    validateJWT,
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    uploadProductImage.single('image'),
    createProduct
);

router.put(
    '/:id',
    validateJWT,
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    uploadProductImage.single('image'),
    updateProduct
);

// ELIMINAR
router.delete(
    '/:id',
    validateJWT,
    hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA),
    deleteProduct
);

export default router;