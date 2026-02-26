"use strict";
import dotenv from 'dotenv';
import { initServer } from './configs/app.js';

dotenv.config();

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in Admin Server:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection in Admin Server:', reason);
    process.exit(1);
});

console.log('Starting KinalSports Admin Server...');
initServer();
