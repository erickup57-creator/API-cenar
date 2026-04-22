import { body, param, query } from "express-validator";

export const validateCreateOrder = [
  body("addressId")
    .trim()
    .notEmpty()
    .withMessage("La dirección es requerida.")
    .isMongoId()
    .withMessage("La dirección no es válida."),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Debe incluir al menos un producto."),
  body("items.*.productId")
    .trim()
    .notEmpty()
    .withMessage("El id del producto es requerido.")
    .isMongoId()
    .withMessage("El id del producto no es válido."),
  body("items.*.quantity")
    .notEmpty()
    .withMessage("La cantidad es requerida.")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser mayor que 0.")
];

export const validateOrderId = [
  param("id")
    .isMongoId()
    .withMessage("El id del pedido no es válido.")
];

export const validateOrdersQuery = [
  query("status")
    .optional()
    .isIn(["pendiente", "en proceso", "completado"])
    .withMessage("Estado inválido."),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("La página debe ser mayor a 0."),
  query("pageSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage("El tamaño de página debe ser mayor a 0.")
];