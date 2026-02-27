'use strict';

import Menu    from '../menu/menu-models.js';
import Product from '../product/products-model.js';

const addExpirationFlag = (menu) => {
    const now = new Date();
    const plain = menu.toObject ? menu.toObject() : { ...menu };
    if (plain.validFrom && plain.validTo) {
        plain.isExpired = now < new Date(plain.validFrom) || now > new Date(plain.validTo);
    }
    return plain;
};

export const getMenus = async (req, res) => {
    try {
        const { restaurant, menuType, isActive } = req.query;
        const filter = {};

        if (restaurant) filter.restaurant = restaurant;
        if (menuType)   filter.menuType   = menuType;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const menus = await Menu.find(filter)
            .populate('restaurant',    'name')
            .populate('items.product', 'name price type image')
            .sort({ createdAt: -1 });

        const menusWithFlags = menus.map(addExpirationFlag);

        return res.status(200).json({
            success: true,
            count: menusWithFlags.length,
            menus: menusWithFlags
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id)
            .populate('restaurant',    'name')
            .populate('items.product', 'name description price type image ingredients');

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        return res.status(200).json({
            success: true,
            menu: addExpirationFlag(menu)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createMenu = async (req, res) => {
    try {
        const data = req.body;

        const { restaurantId } = req.body;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'El campo restaurantId es obligatorio.'
            });
        }

        if (data.items && data.items.length > 0) {
            const ids   = data.items.map(i => i.product);
            const found = await Product.find({
                _id:        { $in: ids },
                restaurant: restaurantId,
                isActive:   true
            }).select('_id');

            if (found.length !== ids.length)
                return res.status(400).json({
                    success: false,
                    message: 'Uno o más productos son inválidos o no pertenecen al restaurante indicado'
                });
        }

        const menu = await Menu.create({
            ...data,
            restaurant: restaurantId
        });

        return res.status(201).json({
            success: true,
            menu
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);
        const isAdmin   = userRoles.includes('ADMIN_SISTEMA');

        if (!isAdmin && menu.restaurant.toString() !== req.body.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para actualizar este menú'
            });
        }

        const updated = await Menu.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            menu: updated
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const addMenuItem = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);
        const isAdmin   = userRoles.includes('ADMIN_SISTEMA');

        if (!isAdmin && menu.restaurant.toString() !== req.body.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para modificar este menú'
            });
        }

        const alreadyAdded = menu.items.some(
            i => i.product.toString() === req.body.product
        );

        if (alreadyAdded)
            return res.status(400).json({
                success: false,
                message: 'El producto ya está en este menú'
            });

        menu.items.push(req.body);
        await menu.save();

        return res.status(200).json({
            success: true,
            menu
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const removeMenuItem = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);
        const isAdmin   = userRoles.includes('ADMIN_SISTEMA');

        if (!isAdmin && menu.restaurant.toString() !== req.body.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para modificar este menú'
            });
        }

        menu.items = menu.items.filter(
            i => i.product.toString() !== req.params.productId
        );

        await menu.save();

        return res.status(200).json({
            success: true,
            menu
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);
        const isAdmin   = userRoles.includes('ADMIN_SISTEMA');

        if (!isAdmin && menu.restaurant.toString() !== req.body.restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para eliminar este menú'
            });
        }

        await Menu.findByIdAndUpdate(req.params.id, { isActive: false });

        return res.status(200).json({
            success: true,
            message: 'Menú desactivado correctamente'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const toggleMenuStatus = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const updated = await Menu.findByIdAndUpdate(
            req.params.id,
            { isActive: !menu.isActive },
            { new: true, runValidators: true }
        ).populate('restaurant', 'name');

        return res.status(200).json({
            success: true,
            message: `Menú ${updated.isActive ? 'activado' : 'desactivado'} correctamente`,
            menu: updated
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const activateCategory = async (req, res) => {
    try {
        const { categoryId, isAvailable } = req.body;

        if (!categoryId || isAvailable === undefined)
            return res.status(400).json({
                success: false,
                message: 'Se requieren los campos categoryId e isAvailable'
            });

        const menu = await Menu.findById(req.params.id)
            .populate('items.product', '_id category');

        if (!menu)
            return res.status(404).json({
                success: false,
                message: `Menú no encontrado con id ${req.params.id}`
            });

        const productIds = menu.items
            .filter(item => item.product && item.product.category &&
                item.product.category.toString() === categoryId)
            .map(item => item.product._id);

        if (productIds.length === 0)
            return res.status(404).json({
                success: false,
                message: 'No se encontraron productos con la categoría especificada en este menú'
            });

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            { isAvailable: Boolean(isAvailable) }
        );

        return res.status(200).json({
            success: true,
            message: `Se actualizaron ${result.modifiedCount} producto(s) de la categoría`,
            updatedCount: result.modifiedCount,
            isAvailable: Boolean(isAvailable)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};