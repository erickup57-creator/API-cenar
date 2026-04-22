import express from "express";
import {
  getCommerceDashboard,
  postStatus
} from "../controllers/CommerceDashboard.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { Roles } from "../utils/enums/roles.js";

const router = express.Router();

router.use(requireAuth, requireRole(Roles.ADMIN));

router.get("/", getCommerceDashboard);
router.post("/status/:id", postStatus);

export default router;
