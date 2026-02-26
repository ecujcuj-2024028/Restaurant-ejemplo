'use strict';

import mongoose from 'mongoose';
import { Review } from './review.model.js';
import dotenv from 'dotenv';

dotenv.config();

const MOCK_PLATOS = [
    new mongoose.Types.ObjectId('684a1f2e3b0c5d7e9f123401'), // Tacos de Res       Q45
    new mongoose.Types.ObjectId('684a1f2e3b0c5d7e9f123402'), // Pizza Margherita   Q85
    new mongoose.Types.ObjectId('684a1f2e3b0c5d7e9f123403'), // Sopa de Mariscos   Q95
    new mongoose.Types.ObjectId('684a1f2e3b0c5d7e9f123404'), // Ensalada César     Q55
    new mongoose.Types.ObjectId('684a1f2e3b0c5d7e9f123405'), // Pastel de Choco    Q35
];

const MOCK_RESTAURANTES = [
    new mongoose.Types.ObjectId('784b2a3f4c1d6e8f0a234501'), // La Fogata Gourmet
    new mongoose.Types.ObjectId('784b2a3f4c1d6e8f0a234502'), // El Rincón del Sabor
];

const MOCK_USUARIOS = ['usr_001', 'usr_002', 'usr_003', 'usr_004', 'usr_005'];

const COMENTARIOS_POSITIVOS = [
    'Excelente platillo, lo recomiendo totalmente. El sabor es único.',
    'Me encantó, definitivamente volveré a pedirlo pronto.',
    'La presentación y el sabor son increíbles, superó mis expectativas.',
    'Muy buen platillo, porciones generosas y bien preparado.',
    'De los mejores que he probado en Guatemala, sin duda.',
];

const COMENTARIOS_MEDIOS = [
    'Está bien, no es lo mejor pero tampoco es malo. Aceptable.',
    'El sabor es bueno pero la porción podría ser más grande.',
    'Estuvo bien, aunque esperaba algo diferente por el precio.',
    'Regular, quizás con un poco más de sazón estaría mejor.',
    'No estuvo mal, pero he probado mejores en otros lugares.',
];

const COMENTARIOS_NEGATIVOS = [
    'No me gustó mucho, esperaba mejor calidad por el precio.',
    'La preparación dejó mucho que desear, no lo pediría de nuevo.',
    'Llegó frío y tardó demasiado. La experiencia no fue buena.',
];

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, daysAgo));
    return d;
};


const generarReviews = () => {
    const reviews = [];

    // Tacos de Res (platoId[0]) → muy popular, muchas reviews altas
    for (let i = 0; i < 12; i++) {
        const rating = randomInt(4, 5);
        reviews.push({
            usuarioId: randomElement(MOCK_USUARIOS),
            restauranteId: randomElement(MOCK_RESTAURANTES),
            platoId: MOCK_PLATOS[0],
            rating,
            comentario: randomElement(COMENTARIOS_POSITIVOS),
            estado: 'activa',
            consumo: { fecha: randomDate(60), montoTotal: 45 * randomInt(1, 3) },
        });
    }

    // Pizza Margherita (platoId[1]) → popular con ratings mixtos
    for (let i = 0; i < 10; i++) {
        const rating = randomInt(3, 5);
        reviews.push({
            usuarioId: randomElement(MOCK_USUARIOS),
            restauranteId: randomElement(MOCK_RESTAURANTES),
            platoId: MOCK_PLATOS[1],
            rating,
            comentario: rating >= 4
                ? randomElement(COMENTARIOS_POSITIVOS)
                : randomElement(COMENTARIOS_MEDIOS),
            estado: 'activa',
            consumo: { fecha: randomDate(60), montoTotal: 85 * randomInt(1, 2) },
        });
    }

    // Sopa de Mariscos (platoId[2]) → menos pedida pero bien valorada
    for (let i = 0; i < 7; i++) {
        const rating = randomInt(3, 5);
        reviews.push({
            usuarioId: randomElement(MOCK_USUARIOS),
            restauranteId: MOCK_RESTAURANTES[0],
            platoId: MOCK_PLATOS[2],
            rating,
            comentario: rating >= 4
                ? randomElement(COMENTARIOS_POSITIVOS)
                : randomElement(COMENTARIOS_MEDIOS),
            estado: 'activa',
            consumo: { fecha: randomDate(45), montoTotal: 95 },
        });
    }

    // Ensalada César (platoId[3]) → ratings medios/bajos
    for (let i = 0; i < 8; i++) {
        const rating = randomInt(2, 4);
        reviews.push({
            usuarioId: randomElement(MOCK_USUARIOS),
            restauranteId: randomElement(MOCK_RESTAURANTES),
            platoId: MOCK_PLATOS[3],
            rating,
            comentario: rating >= 3
                ? randomElement(COMENTARIOS_MEDIOS)
                : randomElement(COMENTARIOS_NEGATIVOS),
            estado: 'activa',
            consumo: { fecha: randomDate(30), montoTotal: 55 },
        });
    }

    // Pastel de Chocolate (platoId[4]) → pocos pedidos
    for (let i = 0; i < 5; i++) {
        const rating = randomInt(3, 5);
        reviews.push({
            usuarioId: randomElement(MOCK_USUARIOS),
            restauranteId: randomElement(MOCK_RESTAURANTES),
            platoId: MOCK_PLATOS[4],
            rating,
            comentario: randomElement(COMENTARIOS_POSITIVOS),
            estado: 'activa',
            consumo: { fecha: randomDate(20), montoTotal: 35 },
        });
    }

    return reviews;
};

const runSeed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Conectado a MongoDB');

        await Review.deleteMany({});
        console.log(' Colección de Reviews limpiada');

        const reviewsData = generarReviews();
        const reviews = await Review.insertMany(reviewsData);

        console.log(`Seed completado: ${reviews.length} reviews insertadas`);

        // Resumen por plato
        const resumen = await Review.aggregate([
            { $group: { _id: '$platoId', total: { $sum: 1 }, promedio: { $avg: '$rating' } } },
            { $sort: { total: -1 } }
        ]);

        console.log('\n Resumen por plato:');
        resumen.forEach(r => {
            console.log(`  platoId: ${r._id} | Reviews: ${r.total} | Rating promedio: ${r.promedio.toFixed(2)}`);
        });

    } catch (error) {
        console.error(' Error en el seed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDesconectado de MongoDB');
    }
};

runSeed();