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

router.post('/order',           validateJWT, createOrder);
router.patch('/cancel/:id',     validateJWT, cancelOrder);
router.get('/orders/history',   validateJWT, getOrderHistory);

router.patch('/orders/:id/status', validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), updateOrderStatus);
router.get('/orders',              validateJWT, hasRole(ADMIN_RESTAURANTE, ADMIN_SISTEMA), getRestaurantOrders);
router.get('/orders/:id/invoice',  validateJWT, getInvoice);

export default router;