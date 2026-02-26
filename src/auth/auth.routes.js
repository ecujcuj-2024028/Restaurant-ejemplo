import { Router } from 'express';
import {
    register,
    login,
    verifyEmail,
    handleRoleRequest,
    requestRoleUpgrade,
    forgotPassword,
    resetPassword,
} from './auth.controller.js';
import { validateRegister, validateVerifyEmail, validateForgotPassword, validateResetPassword } from '../../middlewares/validation.js';
import { authRateLimit, emailRateLimit } from '../../middlewares/request-limit.js';
import { validateJWT } from '../../middlewares/validate-JWT.js';
import { hasRole } from '../../middlewares/hasRole.js';
import { CLIENTE, ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';

const router = Router();

/* ============================================================
   RUTAS PÚBLICAS
   ============================================================ */

router.post('/register', [authRateLimit, validateRegister], register);
router.post('/login', login);

router.post('/verify-email', validateVerifyEmail, verifyEmail);

/* ============================================================
   RESET DE CONTRASEÑA 
   ============================================================ */

// Solicitar reset 
router.post('/forgot-password', [emailRateLimit, validateForgotPassword], forgotPassword);

// Usar token para cambiar contraseña
router.post('/reset-password', validateResetPassword, resetPassword);

/* ============================================================
   GESTIÓN DE ROLES (ADMIN ROOT)
   ============================================================ */

// Estas rutas son las que se disparan cuando el Admin Root hace clic en el correo
router.get('/role-requests/:id/approve', handleRoleRequest);
router.get('/role-requests/:id/reject', handleRoleRequest);

/* ============================================================
   RUTAS PROTEGIDAS (REQUIEREN JWT)
   ============================================================ */

// Solo usuarios con rol valido pueden solicitar cambiar rol
router.post(
    '/request-role-upgrade',
    validateJWT,
    hasRole(CLIENTE,ADMIN_RESTAURANTE,ADMIN_SISTEMA),
    requestRoleUpgrade
);

export default router;