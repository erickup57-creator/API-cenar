import express from "express";
import {
  GetCreate,
  PostCreate,
  GetEdit,
  PostEdit,
  Delete,
} from "../controllers/address.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateGetEdit,
  validatePostCreate,
  validatePostEdit,
  validateDelete,
} from "./validations/addressValidations.js";

const router = express.Router();

router.get("/create", requireAuth, requireRole(Roles.CLIENT), GetCreate);

router.post(
  "/create",
  requireAuth,
  requireRole(Roles.CLIENT),
  validatePostCreate,
  handleValidationErrors("/address/create"),
  PostCreate
);

router.get(
  "/edit/:addressId",
  requireAuth,
  requireRole(Roles.CLIENT),
  validateGetEdit,
  handleValidationErrors("/client/addresses"),
  GetEdit
);

router.post(
  "/edit",
  requireAuth,
  requireRole(Roles.CLIENT),
  validatePostEdit,
  handleValidationErrors((req) => `/address/edit/${req.body.AddressId}`),
  PostEdit
);

router.post(
  "/delete",
  requireAuth,
  requireRole(Roles.CLIENT),
  validateDelete,
  handleValidationErrors("/client/addresses"),
  Delete
);

export default router;
