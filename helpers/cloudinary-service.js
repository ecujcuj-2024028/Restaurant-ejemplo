import { config } from '../configs/configs.js';

export const getDefaultAvatarPath = () => {
    return config.cloudinary.defaultAvatarPath || '';
};