import { body, param } from "express-validator";

const requiredAddressFields = ["label", "street", "sector", "city", "reference"];

function validateRequiredString(field) {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(`El campo ${field} es requerido.`);
}

export const validateAddressId = [
  param("id")
    .isMongoId()
    .withMessage("El id de la direccion no es valido.")
];

export const validateAddressBody = requiredAddressFields.map(validateRequiredString);
