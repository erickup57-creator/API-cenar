import { Router } from "express";
import {
  getAddresses,
  getDashboard,
  getFavorites,
  getOrders,
  getProfile,
  updateProfile,
  getCommercesByTypeView
} from "../controllers/client.controller.js";
import {
  getCatalogue,
  addToCart,
  removeFromCart,
  clearCart,
  getCheckout,
  postCheckout
} from "../controllers/catalogue.controller.js";
import { Roles } from "../utils/enums/roles.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { uploadProfileImage } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(requireAuth, requireRole(Roles.CLIENT));

router.get("/dashboard", getDashboard);
router.get("/dashboard/index", getDashboard);
router.get("/orders", getOrders);
router.get("/addresses", getAddresses);
router.get("/favorites", getFavorites);
router.get("/profile", getProfile);
router.post("/profile", uploadProfileImage, updateProfile);
router.get("/commerces/:commerceTypeId", getCommercesByTypeView);
router.get("/catalogue/:commerceId", getCatalogue);
router.post("/cart/add", addToCart);
router.post("/cart/remove", removeFromCart);
router.post("/cart/clear", clearCart);
router.get("/checkout/:commerceId", getCheckout);
router.post("/checkout", postCheckout);

export default router;