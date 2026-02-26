import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from '../configs/configs.js';

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

// Storage: sube directamente a Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: config.cloudinary.folder || 'restaurant',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'image',
    },
});

// Filtro de archivos (validación antes de subir)
const fileFilter = (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, JPG, PNG, GIF, WEBP)'
            ),
            false
        );
    }
};

// Configuración de multer con Cloudinary Storage
export const upload = multer({
    storage,
    limits: {
        fileSize: config.upload.maxSize,
    },
    fileFilter,
});

/**
 * Middleware para manejar errores de upload
 */
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande',
                error: `El tamaño máximo permitido es ${config.upload.maxSize / (1024 * 1024)}MB`,
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Campo de archivo inesperado',
                error: error.message,
            });
        }
    }

    if (error.message && error.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de archivo no permitido',
            error: 'Solo se permiten imágenes (JPEG, JPG, PNG, GIF, WEBP)',
        });
    }

    next(error);
};

/**
 */
export const deleteFile = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Error eliminando imagen de Cloudinary:', error);
        return false;
    }
};

/**
 * Elimina una imagen de Cloudinary usando su URL completa
 */
export const deleteFileByPath = async (imageUrl) => {
    try {
        const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
        if (!matches) return false;

        const publicId = matches[1];
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Error eliminando archivo por URL de Cloudinary:', error);
        return false;
    }
};