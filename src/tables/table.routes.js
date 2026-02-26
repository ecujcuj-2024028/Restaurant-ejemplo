import { Router } from 'express';
import Table from './table.model.js';
import {
    createTable,
    getTables,
    getTablesByRestaurant,
    updateTableStatus
} from './table.controller.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { validateOwnership } from '../../middlewares/validate-ownership.js';

const router = Router();

router.post('/create', validateJWT, createTable);

router.get('/', validateJWT, getTables);
router.get('/restaurant/:restaurantId', validateJWT, getTablesByRestaurant);

router.patch('/:tableId/status', [
    validateJWT,
    validateOwnership(Table)
], updateTableStatus);

export default router;