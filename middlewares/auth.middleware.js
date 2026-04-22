import jwt from "jsonwebtoken";
import { Roles } from "../utils/enums/roles.js";

export default function isAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      const error = new Error("Not authenticated.");
      error.statusCode = 401;
      throw error;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      const error = new Error("Invalid token.");
      error.statusCode = 401;
      throw error;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name
    };

    return next();
  } catch (error) {
    error.statusCode =
      ["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)
        ? 401
        : error.statusCode || 500;
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("Forbidden.");
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
}
