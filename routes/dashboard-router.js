import express from "express";
import { getDashboard } from "../controllers/DashboardController.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getHomeDashboard } from "../controllers/AdminDashboard.controller.js";

const router = express.Router();

router.get("/", requireAuth, getDashboard);
router.get("/client", requireAuth, getDashboard); 
router.get("/delivery", requireAuth, getDashboard);
router.get("/commerce", requireAuth, getDashboard);
router.get("/AdminDashboard", requireAuth, getHomeDashboard);

export default router;
