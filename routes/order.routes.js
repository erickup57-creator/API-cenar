import express from "express";
import { PostCreate, PostCreateClient, GetDetail } from "../controllers/orders.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { Roles } from "../utils/enums/roles.js";
import { validatePostCreate, validateGetDetail } from "./validations/ordersValidations.js";

const router = express.Router();

function attachSessionUser(req, res, next) {
  const sessionUser = req.session?.user;

  req.user = {
    id: sessionUser?._id || sessionUser?.id,
    role: sessionUser?.role
  };

  next();
}

function handleValidationErrors(req, res, next) {
  const errors = req.orderValidationErrors || [];

  if (errors.length > 0) {
    req.flash("errors", errors);
    return res.redirect("/commerce/dashboard");
  }
  return next();
}

router.post(
  "/create",
  requireAuth,
  requireRole(Roles.COMMERCE),
  attachSessionUser,
  validatePostCreate,
  handleValidationErrors,
  PostCreate
);

router.post(
  "/create-client",
  requireAuth,
  requireRole(Roles.CLIENT),
  attachSessionUser,
  validatePostCreate,
  handleValidationErrors,
  PostCreateClient
);

router.get(
  "/detail/:orderId",
  requireAuth,
  requireRole(Roles.CLIENT),
  validateGetDetail,
  handleValidationErrors,
  GetDetail
);

export default router;