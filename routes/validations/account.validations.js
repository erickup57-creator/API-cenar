import { body } from "express-validator";

export const validateUpdateClient = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido."),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("El apellido es requerido."),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("El teléfono es requerido.")
    .matches(/^[0-9]+$/)
    .withMessage("El teléfono solo puede contener números.")
];

export const validateUpdateCommerce = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo es requerido.")
    .isEmail()
    .withMessage("El correo no es válido."),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("El teléfono es requerido.")
    .matches(/^[0-9]+$/)
    .withMessage("El teléfono solo puede contener números."),
  body("openingTime")
    .trim()
    .notEmpty()
    .withMessage("La hora de apertura es requerida."),
  body("closingTime")
    .trim()
    .notEmpty()
    .withMessage("La hora de cierre es requerida.")
];