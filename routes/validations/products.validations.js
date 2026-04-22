import { body, param } from "express-validator";

function requiredString(field, message) {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(message);
}

const productBodyFields = [
  requiredString("name", "El nombre es requerido."),
  requiredString("description", "La descripcion es requerida."),
  body("price")
    .notEmpty()
    .withMessage("El precio es requerido.")
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un numero mayor o igual a 0.")
    .toFloat(),
  body("categoryId")
    .trim()
    .notEmpty()
    .withMessage("La categoria es requerida.")
    .isMongoId()
    .withMessage("La categoria no es valida.")
];

export const validateProductId = [
  param("id")
    .isMongoId()
    .withMessage("El id del producto no es valido.")
];

export const validateCreateProduct = [
  ...productBodyFields,
  body("image").custom((value, { req }) => {
    if (!req.file) {
      throw new Error("La imagen es requerida.");
    }
    return true;
  })
];

export const validateUpdateProduct = productBodyFields;
