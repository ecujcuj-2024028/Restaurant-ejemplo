'use strict';

import mongoose from 'mongoose';

export const mongoConnection = async () => {
    try {
        console.log('MongoDB | Trying to connect...');

        // Eventos de conexión para monitoreo
        mongoose.connection.on('error', (err) => {
            console.error(`MongoDB | Connection error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB | Disconnected from database');
        });

        mongoose.connection.on('connected', () => {
            console.log('MongoDB | Connected to MongoDB');
        });

        // Conexión principal usando URI del .env
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Tiempo de espera de 5 segundos
            maxPoolSize: 10, // Tamaño máximo del pool de conexiones
        });

    } catch (error) {
        console.error('MongoDB | Could not connect to MongoDB');
        console.error('MongoDB | Error:', error.message);
        process.exit(1);
    }
};