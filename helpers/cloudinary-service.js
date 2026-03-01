import { v2 as cloudinary } from 'cloudinary';
import { config } from '../configs/configs.js';

// URL base construida desde las credenciales del .env
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME?.trim()}/image/upload/`;

// Fallback si no hay CLOUDINARY_DEFAULT_AVATAR en el .env
const UI_AVATARS_FALLBACK = 'https://ui-avatars.com/api/?name=User&background=random&size=200';

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

/**
 * Retorna la URL del avatar default.
 * Usa CLOUDINARY_DEFAULT_AVATAR del .env, o UI Avatars como fallback.
 * @returns {string}
 */
export const getDefaultAvatarUrl = () => {
    return process.env.CLOUDINARY_DEFAULT_AVATAR?.trim() || UI_AVATARS_FALLBACK;
};

/**
 * Retorna el path del avatar default (solo el filename, sin URL base).
 * Retorna null si se está usando UI Avatars como default.
 * @returns {string|null}
 */
export const getDefaultAvatarPath = () => {
    const folder = process.env.CLOUDINARY_FOLDER?.trim() || '';
    const filename = process.env.CLOUDINARY_DEFAULT_AVATAR_FILENAME?.trim() || '';

    if (!filename) return null;

    return `${folder}/${filename}`;
};

/**
 * Sube una imagen a Cloudinary desde una ruta local o URL externa.
 * @param {string} filePath - Ruta local del archivo o URL
 * @param {string} fileName - Nombre público (public_id) en Cloudinary
 * @returns {Promise<string>} secure_url de la imagen subida
 */
export const uploadImage = async (filePath, fileName) => {
    try {
        const folder = config.cloudinary.folder;
        const options = {
            public_id: fileName,
            folder: folder,
            resource_type: 'image',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        };

        const result = await cloudinary.uploader.upload(filePath, options);

        if (result.error) {
            throw new Error(`Error uploading image: ${result.error.message}`);
        }

        return result.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error?.message || error);
        throw new Error(
            `Failed to upload image to Cloudinary: ${error?.message || ''}`
        );
    }
};

/**
 * Elimina una imagen de Cloudinary usando su URL completa.
 * Nunca elimina el avatar default para no afectar otros usuarios.
 * @param {string} imageUrl - URL completa de la imagen
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (imageUrl) => {
    try {
        if (!imageUrl) return true;

        // Proteger el avatar default — no eliminarlo de Cloudinary
        const defaultUrl = getDefaultAvatarUrl();
        if (imageUrl === defaultUrl) return true;

        // Si es URL de UI Avatars, no hay nada que borrar en Cloudinary
        if (imageUrl.startsWith('https://ui-avatars.com')) return true;

        const publicId = extractPublicIdFromUrl(imageUrl);
        if (!publicId) return false;

        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return false;
    }
};

/**
 * Construye la URL completa de una imagen.
 * - Si ya es URL absoluta, la retorna directamente.
 * - Si es path relativo o filename, construye la URL de Cloudinary.
 * - Si está vacío, retorna la URL del avatar default.
 * @param {string|null} imagePath
 * @returns {string}
 */
export const getFullImageUrl = (imagePath) => {
    if (!imagePath) return getDefaultAvatarUrl();

    // Ya es una URL completa
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // Path relativo o filename — construir URL de Cloudinary
    const folder = config.cloudinary.folder || '';
    const pathToUse = imagePath.includes('/')
        ? imagePath
        : `${folder}/${imagePath}`;

    return `${CLOUDINARY_BASE_URL}${pathToUse}`;
};

/**
 * Extrae el public_id de una URL completa de Cloudinary.
 * Ejemplo: .../upload/v123/folder/file.jpg → folder/file
 * @param {string} cloudinaryUrl
 * @returns {string|null}
 */
export const extractPublicIdFromUrl = (cloudinaryUrl) => {
    try {
        const parts = cloudinaryUrl.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        const withVersion = parts.slice(uploadIndex + 1).join('/');
        const withoutVersion = withVersion.replace(/^v\d+\//, '');
        return withoutVersion.replace(/\.[^/.]+$/, '');
    } catch {
        return null;
    }
};

export default {
    uploadImage,
    deleteImage,
    getFullImageUrl,
    getDefaultAvatarUrl,
    getDefaultAvatarPath,
    extractPublicIdFromUrl,
};