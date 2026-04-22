import { body, param} from "express-validator";

function isMongoId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());
}


export function validatePostCreate(req, res, next) {
  const errors = [];

  const clientId = String(req.body?.ClientId ?? "").trim();
  const deliveryId = String(req.body?.DeliveryId ?? "").trim();
  const addressId = String(req.body?.AddressId ?? "").trim();
  const orderProducts = String(req.body?.Products ?? "").trim();

  if (!clientId) {
    errors.push("Client ID is required");
  } else if (!isMongoId(clientId)) {
    errors.push("Invalid client ID format");
  }

  if (!deliveryId) {
    errors.push("Delivery ID is required");
  } else if (!isMongoId(deliveryId)) {
    errors.push("Invalid delivery ID format");
  }

  if (!addressId) {
    errors.push("Address is required");
  } else if (!isMongoId(addressId)) {
    errors.push("Invalid address ID format");
  }

  if (!orderProducts) {
    errors.push("Products are required");
  } else {
    try {
      const parsed = JSON.parse(orderProducts);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        errors.push("At least one product is required");
      }
    } catch {
      errors.push("Invalid products format");
    }
  }

  req.orderValidationErrors = errors;
  next();
}


export const validateGetDetail = [
  param("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID format")
    .escape(),
];
