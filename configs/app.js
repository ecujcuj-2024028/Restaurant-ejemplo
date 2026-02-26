'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Configuraciones y Middlewares
import { validateJWT } from '../middlewares/validate-JWT.js';
import { sequelize, dbConnection as postgresConnection } from "./db-postgres.js";
import { mongoConnection } from "./db-mongo.js";
import { corsOptions } from "./cors-configuration.js";
import { helmetConfiguration } from "./helmet-configuration.js";

// Modelos y Helpers
import { User, UserProfile } from '../src/user/user.model.js';
import { Role, UserRole } from '../src/auth/role.model.js';
import { InventoryItem } from '../src/inventory/inventory.model.js';
import { hashPassword } from '../utils/password-utils.js';
import { ADMIN_SISTEMA, ALLOWED_ROLES } from '../helpers/role-constants.js';

// Rutas Existentes
import authRoutes from '../src/auth/auth.routes.js';
import analyticsRoutes from '../src/analytics/analytics.routes.js';
import restaurantRoutes from '../src/restaurants/restaurant.routes.js';
import tableRoutes from '../src/tables/table.routes.js';
import inventoryRoutes from '../src/inventory/inventory.routes.js';
import reservationRoutes from '../src/Reservations/reservation.routes.js';
import orderRoutes from '../src/orders/order.routes.js';

// Nuevos Módulos
import categoryRoutes from '../src/gastronomy-oferts/category-routes.js';
import productRoutes from '../src/product/product-routes.js';
import eventRoutes from '../src/Eventos/events-routes.js';
import menuRoutes from '../src/menu/menu-routes.js';
import searchRoutes from '../src/search/search-routes.js';
import categoriesRoutes from '../src/category/categories.routes.js';
import customerRoutes from '../src/customer/customerHistory.routes.js'

// GT-13: Gestión de Perfil de Usuario
import userRoutes from '../src/user/user.routes.js';

const BASE_PATH = '/restaurantManagement/v1';

/* =========================
   Lógica de Administrador Root
   ========================= */
const ensureRootAdmin = async () => {
    try {
        const existingRoot = await User.findOne({ where: { Email: process.env.ROOT_ADMIN_EMAIL } });

        if (existingRoot) {
            console.log('PostgreSQL | Root admin already exists');
            return;
        }

        console.log('PostgreSQL | Creating ROOT ADMIN...');

        const hashedPassword = await hashPassword(process.env.ROOT_ADMIN_PASSWORD);

        const user = await User.create({
            Name: 'Root',
            Surname: 'Admin',
            Username: process.env.ROOT_ADMIN_USERNAME,
            Email: process.env.ROOT_ADMIN_EMAIL,
            Password: hashedPassword,
            Status: true
        });

        await UserProfile.create({ UserId: user.Id, Phone: '00000000' });

        const role = await Role.findOne({ where: { Name: ADMIN_SISTEMA } });
        if (role) {
            await UserRole.create({ UserId: user.Id, RoleId: role.Id });
            console.log('PostgreSQL | ROOT ADMIN CREATED SUCCESSFULLY');
        }
    } catch (error) {
        console.error('Error ensuring root admin:', error);
    }
};

/* =========================
   Middlewares Globales
   ========================= */
const middlewares = (app) => {
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(express.json({ limit: '10mb' }));
    app.use(cors(corsOptions));
    app.use(helmet(helmetConfiguration));
    app.use(morgan('dev'));
};

/* =========================
   Definición de Rutas
   ========================= */
const routes = (app) => {
    // Rutas Públicas
    app.use(`${BASE_PATH}/auth`, authRoutes);
    app.use(`${BASE_PATH}/search`, searchRoutes);
    app.use(`${BASE_PATH}/products`, productRoutes);
    app.use(`${BASE_PATH}/menus`, menuRoutes);
    app.use(`${BASE_PATH}/events`, eventRoutes);
    app.use(`${BASE_PATH}/restaurants`, restaurantRoutes);
    app.use(`${BASE_PATH}/categories`, categoryRoutes);
    app.use(`${BASE_PATH}/category`, categoriesRoutes);
    app.use(`${BASE_PATH}/analytics`, analyticsRoutes);

    // Rutas Protegidas (Requieren validateJWT)
    app.use(`${BASE_PATH}/tables`, validateJWT, tableRoutes);
    app.use(`${BASE_PATH}/inventory`, validateJWT, inventoryRoutes);
    app.use(`${BASE_PATH}/reservations`, validateJWT, reservationRoutes);
    app.use(`${BASE_PATH}/users`, validateJWT, userRoutes);
    app.use(`${BASE_PATH}/orders`, validateJWT, orderRoutes);
    app.use(`${BASE_PATH}/customer`, validateJWT, customerRoutes);

    // Health Check
    app.get(`${BASE_PATH}/health`, (req, res) => {
        return res.status(200).json({
            status: 'Healthy',
            timestamp: new Date().toISOString(),
            service: 'Kinal Restaurant Admin Server',
            databases: { postgresql: 'Connected', mongodb: 'Connected' }
        });
    });

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ success: false, message: 'Endpoint not found' });
    });
};

/* =========================
   Inicialización del Servidor
   ========================= */
export const initServer = async () => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    try {
        console.log('--- STARTING Kinal Restaurant INFRASTRUCTURE ---');

        // 1. Conexiones a DB
        await Promise.all([postgresConnection(), mongoConnection()]);

        // 2. Sincronización y Semillas (Solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('PostgreSQL | Tables synchronized (including inventory_items)');

            const count = await Role.count();
            if (count === 0) {
                await Role.bulkCreate(ALLOWED_ROLES.map(name => ({ Name: name })));
                console.log('PostgreSQL | Default roles created');
            }
        }

        // 3. Asegurar Administrador y Configurar App
        await ensureRootAdmin();
        middlewares(app);
        routes(app);

        // 4. Encendido
        app.listen(PORT, () => {
            console.log('---------------------------------------------');
            console.log(`Server running on port: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}${BASE_PATH}/health`);
            console.log('---------------------------------------------');
        });

    } catch (error) {
        console.error('CRITICAL ERROR: Server initialization failed:', error.message);
        process.exit(1);
    }
};