import mongoose from 'mongoose';

export const validateOwnership = (Model) => {
    return async (req, res, next) => {
        try {
            const resourceId =
                req.params.id ||
                req.params.tableId ||
                req.params.productId;

            const userId = req.userId;

            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID del recurso no proporcionado'
                });
            }

            let resource;

            // 🔹 Caso Restaurant (NO necesita populate)
            if (Model.modelName === 'Restaurant') {
                resource = await Model.findById(resourceId);
            }
            // 🔹 Caso Table u otros que dependen de restaurant
            else {
                resource = await Model.findById(resourceId).populate('restaurant');
            }

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Recurso no encontrado o no pertenece a ningún restaurante'
                });
            }

            let isOwner = false;

            if (Model.modelName === 'Restaurant') {
                isOwner = resource.ownerId === userId;
            } else if (resource.restaurant) {
                isOwner = resource.restaurant.ownerId === userId;
            }

            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado, no eres el propietario de este recurso'
                });
            }

            req.resource = resource;
            next();

        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    };
};