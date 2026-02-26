'use strict';

import { Router } from 'express';
import {
    getMenus,
    getMenu,
    createMenu,
    updateMenu,
    addMenuItem,
    removeMenuItem,
    deleteMenu,
    toggleMenuStatus,
    activateCategory
} from '../menu/menu-controller.js';

import { validateJWT }    from '../../middlewares/validate-JWT.js';
import { hasRole }        from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router({ mergeParams: true });

router.get('/',    getMenus);
router.get('/:id', getMenu);

router.post('/',    [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], createMenu);
router.put('/:id',  [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], updateMenu);
router.delete('/:id', [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], deleteMenu);

router.post('/:id/items',              [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], addMenuItem);
router.delete('/:id/items/:productId', [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], removeMenuItem);

router.patch('/:id/toggle-status',    [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], toggleMenuStatus);

router.patch('/:id/activate-category', [validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA)], activateCategory);

export default router;