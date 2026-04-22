import { validationResult } from "express-validator";

// Redirige con errores flash si la validación falla, de lo contrario continúa.
export function handleValidationErrors(redirectTo = null) {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("errors", errors.array().map((err) => err.msg));

      const target = typeof redirectTo === "function" ? redirectTo(req) : redirectTo;
      return res.redirect(target || req.originalUrl);
    }
    return next();
  };
}