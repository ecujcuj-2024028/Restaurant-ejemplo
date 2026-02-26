'use strict';
import { User, UserProfile } from './user.model.js';
import { UserRole } from '../auth/role.model.js';
import { Role } from '../auth/role.model.js';
import { cloudinary, extractPublicId } from '../../middlewares/restaurant-uploader.js';

/* =========================
   GET /users/profile
   Retorna el perfil completo del usuario autenticado
   ========================= */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.Id;

        const user = await User.findByPk(userId, {
            attributes: ['Id', 'Name', 'Surname', 'Username', 'Email', 'Status'],
            include: [
                {
                    model: UserProfile,
                    as: 'UserProfile',
                    attributes: ['Phone', 'ProfilePicture'],
                },
                {
                    model: UserRole,
                    as: 'UserRoles',
                    include: [{ model: Role, as: 'Role', attributes: ['Name'] }],
                },
            ],
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({
            success: true,
            user: {
                id            : user.Id,
                name          : user.Name,
                surname       : user.Surname,
                username      : user.Username,
                email         : user.Email,
                status        : user.Status,
                phone         : user.UserProfile?.Phone         || null,
                profilePicture: user.UserProfile?.ProfilePicture || null,
                roles         : user.UserRoles.map(ur => ur.Role.Name),
            },
        });

    } catch (error) {
        console.error('[UserController] getProfile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   PUT /users/profile
   Actualiza nombre, apellido y teléfono
   ========================= */
export const updateProfile = async (req, res) => {
    try {
        const userId      = req.user.Id;
        const { name, surname, phone } = req.body;

        if (!name && !surname && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Debes enviar al menos un campo para actualizar (name, surname, phone).',
            });
        }

        // Actualizar User si hay cambios de nombre/apellido
        if (name || surname) {
            const updates = {};
            if (name)    updates.Name    = name;
            if (surname) updates.Surname = surname;

            await User.update(updates, { where: { Id: userId } });
        }

        // Actualizar UserProfile si hay cambio de teléfono
        if (phone) {
            await UserProfile.update({ Phone: phone }, { where: { UserId: userId } });
        }

        // Retornar perfil actualizado
        const updated = await User.findByPk(userId, {
            attributes: ['Id', 'Name', 'Surname', 'Username', 'Email'],
            include: [{ model: UserProfile, as: 'UserProfile', attributes: ['Phone', 'ProfilePicture'] }],
        });

        return res.status(200).json({
            success: true,
            message: 'Perfil actualizado correctamente.',
            user: {
                id            : updated.Id,
                name          : updated.Name,
                surname       : updated.Surname,
                username      : updated.Username,
                email         : updated.Email,
                phone         : updated.UserProfile?.Phone          || null,
                profilePicture: updated.UserProfile?.ProfilePicture  || null,
            },
        });

    } catch (error) {
        console.error('[UserController] updateProfile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =========================
   PATCH /users/profile/picture
   Sube foto de perfil a Cloudinary y elimina la anterior
   ========================= */
export const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen.' });
        }

        const userId = req.user.Id;

        // Obtener imagen anterior para eliminarla de Cloudinary
        const profile = await UserProfile.findOne({ where: { UserId: userId } });

        if (profile?.ProfilePicture) {
            try {
                const publicId = extractPublicId(profile.ProfilePicture);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (err) {
                // No bloquear si falla la eliminación de la imagen anterior
                console.warn('[UserController] No se pudo eliminar imagen anterior:', err.message);
            }
        }

        // Guardar nueva URL de Cloudinary
        const newPictureUrl = req.file.path;
        await UserProfile.update({ ProfilePicture: newPictureUrl }, { where: { UserId: userId } });

        return res.status(200).json({
            success       : true,
            message       : 'Foto de perfil actualizada correctamente.',
            profilePicture: newPictureUrl,
        });

    } catch (error) {
        console.error('[UserController] updateProfilePicture:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
