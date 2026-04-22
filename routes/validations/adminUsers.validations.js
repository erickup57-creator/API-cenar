import { body, param, query } from "express-validator";
import { Roles } from "../../utils/enums/roles.js";

export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page debe ser un número mayor a 0"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit debe ser entre 1 y 100"),

  query("search")
    .optional()
    .isString()
    .trim()
];

export const validateCreateAdmin = [
  body("firstName")
    .notEmpty()
    .withMessage("First name es requerido")
    .isString()
    .isLength({ min: 2, max: 50 }),

  body("lastName")
    .notEmpty()
    .withMessage("Last name es requerido")
    .isString()
    .isLength({ min: 2, max: 50 }),

  body("userName")
    .notEmpty()
    .withMessage("Username es requerido")
    .isString()
    .isLength({ min: 3, max: 30 }),

  body("email")
    .notEmpty()
    .withMessage("Email es requerido")
    .isEmail()
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password es requerido")
    .isLength({ min: 6 }),

  body("phone")
    .optional()
    .isString()
    .isLength({ min: 7, max: 15 })
];

export const validateUpdateAdmin = [
  param("id")
    .isMongoId()
    .withMessage("ID inválido"),

  body("firstName")
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 }),

  body("lastName")
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 }),

  body("userName")
    .optional()
    .isString()
    .isLength({ min: 3, max: 30 }),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail(),

  body("phone")
    .optional()
    .isString()
    .isLength({ min: 7, max: 15 })
];

export const validateUpdateUserStatus = [
  param("id")
    .isMongoId()
    .withMessage("ID inválido"),

  body("isActive")
    .notEmpty()
    .withMessage("isActive es requerido")
    .isBoolean()
    .withMessage("isActive debe ser boolean")
];