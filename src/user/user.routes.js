'use strict';
import { Router } from 'express';
import { getProfile, updateProfile, updateProfilePicture } from './user.controller.js';
import { uploadRestaurantImage } from '../../middlewares/restaurant-uploader.js';

const router = Router();

router.get('/profile', getProfile);

router.put('/profile', updateProfile);

router.patch(
    '/profile/picture',
    uploadRestaurantImage.single('image'),
    updateProfilePicture
);

export default router;
