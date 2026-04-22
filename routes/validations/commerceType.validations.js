import { body, param } from "express-validator";

export const validateCommerceTypeId = [
  param("id")
    .isMongoId()
    .withMessage("Invalid commerce type id")
];

export const validateCreateCommerceType = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
];

export const validateUpdateCommerceType = [
  param("id")
    .isMongoId()
    .withMessage("Invalid commerce type id"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
];