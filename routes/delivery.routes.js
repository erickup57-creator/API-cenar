import { Router } from "express";
import {
  getDashboard,
  getOrderDetail,
  getProfile,
  postCompleteOrder,
  postProfile
} from "../controllers/delivery.controller.js";
import { Roles } from "../utils/enums/roles.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { uploadProfileImage } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(requireAuth, requireRole(Roles.DELIVERY));

router.get("/", getDashboard);
router.get("/dashboard", getDashboard);
router.get("/dashboard/index", getDashboard);
router.get("/orders/:orderId", getOrderDetail);
router.post("/orders/:orderId/complete", postCompleteOrder);
router.get("/profile", getProfile);
router.post("/profile", uploadProfileImage, postProfile);

export default router;
