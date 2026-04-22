import { validationResult } from "express-validator";

export function handleValidationErrors() {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.");
      error.statusCode = 400;
      error.data = errors.array().map((e) => ({
        field: e.path,
        message: e.msg
      }));
      return next(error);
    }
    return next();
  };
}