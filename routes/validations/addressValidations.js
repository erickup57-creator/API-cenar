import { body, param } from "express-validator";

export const validateGetEdit = [
  param("addressId")
    .trim()
    .notEmpty()
    .withMessage("El ID de la direccion es obligatorio")
    .isMongoId()
    .withMessage("El ID de la direccion no es valido")
    .escape(),
];

export const validatePostCreate = [
  body("Name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .escape(),
  body("Description")
    .trim()
    .notEmpty()
    .withMessage("La descripcion es obligatoria")
    .escape(),
];

export const validatePostEdit = [
  body("Name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .escape(),
  body("Description")
    .trim()
    .notEmpty()
    .withMessage("La descripcion es obligatoria")
    .escape(),
  body("AddressId")
    .trim()
    .notEmpty()
    .withMessage("El ID de la direccion es obligatorio")
    .isMongoId()
    .withMessage("El ID de la direccion no es valido")
    .escape(),
];

export const validateDelete = [
  body("AddressId")
    .trim()
    .notEmpty()
    .withMessage("El ID de la direccion es obligatorio")
    .isMongoId()
    .withMessage("El ID de la direccion no es valido")
    .escape(),
];
