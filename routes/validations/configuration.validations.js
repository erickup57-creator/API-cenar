import { body, param } from "express-validator";

export const validateConfigurationKey = [
  param("key")
    .trim()
    .notEmpty()
    .withMessage("Configuration key is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Configuration key must be between 2 and 50 characters")
];

export const validateUpdateConfiguration = [
  param("key")
    .trim()
    .notEmpty()
    .withMessage("Configuration key is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Configuration key must be between 2 and 50 characters"),

  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required")
    .custom((value, { req }) => {
      if (value.toUpperCase() !== req.params.key.toUpperCase()) {
        throw new Error("Body key must match route key");
      }
      return true;
    }),

  body("value")
    .trim()
    .notEmpty()
    .withMessage("Value is required")
    .custom((value, { req }) => {
      const key = req.params.key.toUpperCase();

      if (key === "ITBIS") {
        const numericValue = Number(value);

        if (Number.isNaN(numericValue)) {
          throw new Error("ITBIS value must be numeric");
        }

        if (numericValue < 0 || numericValue > 100) {
          throw new Error("ITBIS must be between 0 and 100");
        }
      }

      return true;
    })
];