import { Router } from 'express';
import Restaurant from './restaurant.model.js';
import {
    createRestaurant,
    getRestaurants,
    getRestaurantById,
    updateRestaurant,
    deleteRestaurant
} from './restaurant.controller.js';

import { upload } from '../../helpers/file-upload.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';
import { validateOwnership } from '../../middlewares/validate-ownership.js';

const router = Router();

/* Solo admin */
router.post(
    '/create',
    validateJWT,
    upload.single('image'),
    hasRole(ADMIN_SISTEMA, ADMIN_RESTAURANTE),
    createRestaurant
);  

// EDITAR: Ahora el dueño también puede, pero validamos que sea SUYO
router.put(
    '/:id',
    [
        validateJWT,
        hasRole(ADMIN_SISTEMA, ADMIN_RESTAURANTE),
        validateOwnership(Restaurant)
    ],
    upload.single('image'),
    updateRestaurant
);

router.delete(
    '/:id',
    [
        validateJWT,
        hasRole(ADMIN_SISTEMA, ADMIN_RESTAURANTE),
        validateOwnership(Restaurant)
    ],
    deleteRestaurant
);

/* publico*/
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);

export default router;
