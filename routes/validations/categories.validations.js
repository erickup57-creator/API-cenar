import { body, param } from "express-validator";

function validateRequiredString(field, message) {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(message);
}

export const validateCategoryId = [
  param("id")
    .isMongoId()
    .withMessage("El id de la categoria no es valido.")
];

export const validateCategoryBody = [
  validateRequiredString("name", "El nombre es requerido."),
  validateRequiredString("description", "La descripcion es requerida.")
];
