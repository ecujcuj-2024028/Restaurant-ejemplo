/**
 * Middleware para restringir rutas por roles
 * @param {...string} roles - Lista de roles permitidos
 */
export const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({
                success: false,
                message: 'Se requiere validar el token antes de verificar el rol'
            });
        }

        // Extraer los nombres de los roles que tiene el usuario
        // Según tu user-db.js, UserRoles viene incluido con el objeto Role
        const userRoles = req.user.UserRoles.map(ur => ur.Role.Name);

        // Verificar si el usuario tiene al menos uno de los roles requeridos
        const hasPermission = roles.some(role => userRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `El servicio requiere uno de estos roles: [${roles.join(', ')}]`
            });
        }

        next();
    };
};