import { body, param } from "express-validator";

export const validateToggleFavorite = [
  body("CommerceId")
    .trim()
    .notEmpty()
    .withMessage("Commerce ID is required")
    .isMongoId()
    .withMessage("Invalid commerce ID format")
    .escape(),
];

export const validateDeleteFavorite = [
  body("FavoriteId")
    .trim()
    .notEmpty()
    .withMessage("Favorite ID is required")
    .isMongoId()
    .withMessage("Invalid favorite ID format")
    .escape(),
];

