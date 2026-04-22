import { body } from "express-validator";

export const validateLogin = [
  body("userNameOrEmail")
    .trim()
    .notEmpty()
    .withMessage("El usuario o correo es requerido."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es requerida.")
];

export const validateRegisterClient = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido."),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("El apellido es requerido."),
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("El nombre de usuario es requerido."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo es requerido.")
    .isEmail()
    .withMessage("El correo no es válido."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es requerida.")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres."),
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirmar contraseña es requerido.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Las contraseñas no coinciden.");
      }
      return true;
    }),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("El teléfono es requerido.")
];

export const validateRegisterDelivery = validateRegisterClient;

export const validateRegisterCommerce = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("El nombre de usuario es requerido."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo es requerido.")
    .isEmail()
    .withMessage("El correo no es válido."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es requerida.")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres."),
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirmar contraseña es requerido.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Las contraseñas no coinciden.");
      }
      return true;
    }),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre del comercio es requerido."),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("El teléfono es requerido."),
  body("openingTime")
    .trim()
    .notEmpty()
    .withMessage("La hora de apertura es requerida."),
  body("closingTime")
    .trim()
    .notEmpty()
    .withMessage("La hora de cierre es requerida."),
  body("commerceTypeId")
    .trim()
    .notEmpty()
    .withMessage("El tipo de comercio es requerido.")
    .isMongoId()
    .withMessage("El tipo de comercio no es válido.")
];

export const validateConfirmEmail = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("El token es requerido.")
];

export const validateForgotPassword = [
  body("userNameOrEmail")
    .trim()
    .notEmpty()
    .withMessage("El usuario o correo es requerido.")
];

export const validateResetPassword = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("El token es requerido."),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es requerida.")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres."),
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirmar contraseña es requerido.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Las contraseñas no coinciden.");
      }
      return true;
    })
];