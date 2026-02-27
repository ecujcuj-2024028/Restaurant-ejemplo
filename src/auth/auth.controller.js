import { sequelize } from '../../configs/db-postgres.js';
import { User, UserProfile, UserEmail, UserPasswordReset } from '../user/user.model.js';
import { Role, UserRole } from '../auth/role.model.js';
import { CLIENTE, ADMIN_RESTAURANTE, ADMIN_SISTEMA } from '../../helpers/role-constants.js';
import {
    sendVerificationEmail,
    sendRoleRequestEmail,
    sendRoleUpgradeResponseEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
} from '../../helpers/email-service.js';
import { generateJWT, generateVerificationToken, verifyVerificationToken } from '../../helpers/generate-jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password-utils.js';
import {
    findUserByEmailOrUsername,
    findUserByEmail,
    findUserByPasswordResetToken,
    updatePasswordResetToken,
    updateUserPassword,
} from '../../helpers/user-db.js';
import { RoleUpgradeRequest } from './RoleUpgradeRequest.js';

/* =========================
   REGISTER
   ========================= */
export const register = async (req, res) => {
    const { name, surname, username, email, password, phone } = req.body;

    try {
        const existing = await User.findOne({
            where: {
                [Op.or]: [
                    { Email: email.toLowerCase() },
                    { Username: username.toLowerCase() }
                ]
            }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'El email o username ya están en uso.'
            });
        }

        const t = await sequelize.transaction();

        try {
            const hashedPassword = await hashPassword(password);

            const user = await User.create({
                Name: name,
                Surname: surname,
                Username: username.toLowerCase(),
                Email: email.toLowerCase(),
                Password: hashedPassword,
                Status: false
            }, { transaction: t });

            await UserProfile.create({ UserId: user.Id, Phone: phone }, { transaction: t });

            const role = await Role.findOne({ where: { Name: CLIENTE } });
            if (!role) throw new Error(`El rol ${CLIENTE} no existe.`);

            await UserRole.create({ UserId: user.Id, RoleId: role.Id }, { transaction: t });

            const verificationToken = await generateVerificationToken(user.Id, 'EMAIL_VERIFICATION');

            await UserEmail.create({
                UserId: user.Id,
                EmailVerificationToken: verificationToken,
                EmailVerificationTokenExpiry: new Date(Date.now() + (24 * 60 * 60 * 1000))
            }, { transaction: t });

            await UserPasswordReset.create({ UserId: user.Id }, { transaction: t });

            await t.commit();

            sendVerificationEmail(user.Email, user.Name, verificationToken)
                .catch(err => console.error('Error enviando email:', err));

            return res.status(201).json({
                success: true,
                message: 'Usuario registrado. Por favor verifica tu correo para activar tu cuenta.',
                user: { username: user.Username, email: user.Email }
            });

        } catch (error) {
            await t.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({
            success: false,
            message: 'Ocurrió un error interno en el servidor.'
        });
    }
};
/* =========================
   LOGIN
   ========================= */
export const login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        const user = await findUserByEmailOrUsername(emailOrUsername);

        if (!user) return res.status(404).json({ success: false, message: 'Credenciales inválidas.' });

        if (!user.Status) {
            return res.status(403).json({ success: false, message: 'Cuenta desactivada o correo no verificado.' });
        }

        const isMatch = await verifyPassword(user.Password, password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });

        const roles = user.UserRoles.map(ur => ur.Role.Name);
        const token = await generateJWT(user.Id, { roles });

        return res.status(200).json({
            success: true,
            message: `Bienvenido, ${user.Name}`,
            token,
            user: { id: user.Id, username: user.Username, roles }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
};

/* =========================
   EMAIL VERIFICATION
   ========================= */
export const verifyEmail = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { token } = req.body;
        const record = await UserEmail.findOne({ where: { EmailVerificationToken: token }, transaction: t });

        if (!record || new Date() > record.EmailVerificationTokenExpiry) {
            return res.status(400).json({ success: false, message: "Token inválido o expirado." });
        }

        record.EmailVerified = true;
        record.EmailVerificationToken = null;
        record.EmailVerificationTokenExpiry = null;
        await record.save({ transaction: t });

        await User.update({ Status: true }, { where: { Id: record.UserId }, transaction: t });

        await t.commit();
        return res.status(200).json({ success: true, message: "Correo verificado y cuenta activada." });
    } catch (error) {
        if (t) await t.rollback();
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   FORGOT PASSWORD
   ========================= */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await findUserByEmail(email);

        if (user && user.Status) {
            const resetToken = await generateVerificationToken(user.Id, 'PASSWORD_RESET', '1h');

            await updatePasswordResetToken(
                user.Id,
                resetToken,
                new Date(Date.now() + 60 * 60 * 1000)
            );

            sendPasswordResetEmail(user.Email, user.Name, resetToken)
                .then(() => console.log(`[Auth] Reset email enviado a: ${user.Email}`))
                .catch(err => console.error('[Auth] Error enviando reset email:', err));
        }

        return res.status(200).json({
            success: true,
            message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
        });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

/* =========================
   RESET PASSWORD
   ========================= */
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // 1. Verificar JWT válido
        let decoded;
        try {
            decoded = await verifyVerificationToken(token);
        } catch {
            return res.status(400).json({ success: false, message: 'El token es inválido o ha expirado.' });
        }

        if (decoded.type !== 'PASSWORD_RESET') {
            return res.status(400).json({ success: false, message: 'Token no válido para restablecimiento de contraseña.' });
        }

        // 2. Verificar token en BD (también verifica expiración)
        const user = await findUserByPasswordResetToken(token);

        if (!user) {
            return res.status(400).json({ success: false, message: 'El token es inválido o ha expirado.' });
        }

        // 3. Hashear nueva contraseña y limpiar token
        const hashedPassword = await hashPassword(newPassword);
        await updateUserPassword(user.Id, hashedPassword);

        // 4. Notificar al usuario
        sendPasswordChangedEmail(user.Email, user.Name)
            .catch(err => console.error('[Auth] Error enviando confirmación:', err));

        return res.status(200).json({
            success: true,
            message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

/* =========================
   ROLE UPGRADE REQUESTS
   ========================= */
export const requestRoleUpgrade = async (req, res) => {
    try {
        const { requestedRole } = req.body;

        const currentRoleName = req.user.UserRoles && req.user.UserRoles.length > 0
            ? req.user.UserRoles[0].Role.Name
            : 'Sin Rol';

        if (currentRoleName === requestedRole) {
            return res.status(400).json({ success: false, message: 'Ya tienes este rol asignado' });
        }

        const existingRequest = await RoleUpgradeRequest.findOne({
            where: { UserId: req.user.Id, Status: 'PENDING' }
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'Ya tienes una solicitud pendiente' });
        }

        const request = await RoleUpgradeRequest.create({
            UserId: req.user.Id,
            RequestedRole: requestedRole,
            Status: 'PENDING'
        });

        const adminRoot = await User.findOne({ where: { Email: process.env.ROOT_ADMIN_EMAIL } });

        if (adminRoot) {
            sendRoleRequestEmail({
                adminEmail: adminRoot.Email,
                userName: `${req.user.Name} ${req.user.Surname}`,
                userEmail: req.user.Email,
                currentRole: currentRoleName,
                requestedRole: requestedRole,
                requestId: request.Id
            }).catch(err => console.error('Error enviando email al admin:', err));
        }

        return res.status(201).json({ success: true, message: 'Solicitud enviada correctamente.', data: request });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const handleRoleRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        if (token !== process.env.ROOT_ADMIN_TOKEN) {
            return res.status(403).send('<h1>Acceso Denegado</h1>');
        }

        const request = await RoleUpgradeRequest.findByPk(id);
        if (!request || request.Status !== 'PENDING') {
            return res.status(404).send('<h1>Solicitud no encontrada o ya procesada</h1>');
        }

        const rootAdmin = await User.findOne({ where: { Email: process.env.ROOT_ADMIN_EMAIL } });
        const isApproval = req.path.includes('approve');
        const action = isApproval ? 'APPROVED' : 'REJECTED';

        request.Status = action;
        request.ReviewedBy = rootAdmin ? rootAdmin.Id : null;
        await request.save();

        if (isApproval) {
            const role = await Role.findOne({ where: { Name: request.RequestedRole } });
            await UserRole.destroy({ where: { UserId: request.UserId } });
            await UserRole.create({ UserId: request.UserId, RoleId: role.Id });
        }

        const requestingUser = await User.findByPk(request.UserId);
        if (requestingUser) {
            sendRoleUpgradeResponseEmail({
                userEmail: requestingUser.Email,
                userName: requestingUser.Name,
                requestedRole: request.RequestedRole,
                status: action
            }).catch(err => console.error('Error enviando respuesta al usuario:', err));
        }

        return res.send(`
            <div style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h1 style="color: ${isApproval ? '#2e7d32' : '#c62828'};">Solicitud ${isApproval ? 'Aprobada' : 'Rechazada'}</h1>
                <p>Se ha enviado una notificación a <b>${requestingUser ? requestingUser.Email : 'el usuario'}</b>.</p>
            </div>
        `);
    } catch (error) {
        return res.status(500).send(`Error interno: ${error.message}`);
    }
};
