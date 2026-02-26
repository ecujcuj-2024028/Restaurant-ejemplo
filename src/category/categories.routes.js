'use strict';

import { Router } from 'express';
import {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
} from './categories.controller.js';
import { upload } from '../../helpers/file-upload.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();

// Públicas
router.get('/',    getCategories);
router.get('/:id', getCategory);

// Protegidas
router.post('/create', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), upload.single('image'), createCategory);
router.put('/:id',     validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), upload.single('image'), updateCategory);
router.delete('/:id',  validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), deleteCategory);

export default router;