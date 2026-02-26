'use strict';

import { Router } from 'express';
import {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    updateEventStatus,
    deleteEvent,
    addFeaturedProduct,
    removeFeaturedProduct
} from '../Eventos/events-controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();

// públicos
router.get('/', getEvents);
router.get('/:id', getEvent);

router.post('/', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), createEvent);
router.put('/:id', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), updateEvent);
router.patch('/:id/status', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), updateEventStatus);
router.delete('/:id', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), deleteEvent);
router.post('/:id/featured-products', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), addFeaturedProduct);
router.delete('/:id/featured-products/:productId', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), removeFeaturedProduct);

export default router;