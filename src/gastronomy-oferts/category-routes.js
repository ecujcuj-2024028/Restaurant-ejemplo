'use strict';

import { Router } from 'express';
import {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
} from '../gastronomy-oferts/category-controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();
// público
router.get('/',    getCategories);
router.get('/:id', getCategory);    

router.post('/',      validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), createCategory);
router.put('/:id',    validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), updateCategory);
router.delete('/:id', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), deleteCategory);

export default router;