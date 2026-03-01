import { Router } from 'express';
import {
  createOrder,
  cancelOrder,
  getOrderHistory,
  updateOrderStatus,
  getRestaurantOrders,
  getInvoice,
} from './order.controller.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();

router.post('/',           validateJWT, createOrder);
router.patch('/:id/cancel',     validateJWT, cancelOrder);
router.get('/history',   validateJWT, getOrderHistory);

router.patch('/:id/status', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), updateOrderStatus);
router.get('/',              validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), getRestaurantOrders);
router.get('/:id/invoice',  validateJWT, getInvoice);

export default router;