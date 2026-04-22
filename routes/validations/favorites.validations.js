import { body, param, query } from "express-validator";

export const validateFavoritesPagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("La pagina debe ser un numero entero mayor o igual a 1.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("El limite debe ser un numero entero entre 1 y 100.")
    .toInt()
];

export const validateFavoriteBody = [
  body("commerceId")
    .trim()
    .notEmpty()
    .withMessage("El comercio es requerido.")
    .isMongoId()
    .withMessage("El comercio no es valido.")
];

export const validateFavoriteCommerceId = [
  param("commerceId")
    .isMongoId()
    .withMessage("El comercio no es valido.")
];
