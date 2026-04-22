import express from 'express';
import {
     PostCreate,
     PostDelete
} from '../controllers/favorite.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { handleValidationErrors } from '../middlewares/handleValidation.js';
import {
     validateToggleFavorite,
     validateDeleteFavorite 
    } from './validations/favoriteValidations.js';

const router = express.Router();

router.post(
    "/create",
    requireAuth,
    validateToggleFavorite,
    handleValidationErrors("/client/favorites"),
    PostCreate
);

router.post(
    "/delete",
    requireAuth,
    validateDeleteFavorite,
    handleValidationErrors("/client/favorites"),
    PostDelete
);

export default router;