import express from "express";

import {
  getAdminDashboard,
  getAdminSave,
  postAdminSave,
  getAdminEdit,
  postAdminEdit,
  postAdminStatus
} from "../controllers/AdminController.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { Roles } from "../utils/enums/roles.js";

const router = express.Router();

router.use(requireAuth, requireRole(Roles.ADMIN));

router.get("/", getAdminDashboard);

router.get("/create", getAdminSave);
router.post("/create", postAdminSave);

router.get("/edit/:id", getAdminEdit);
router.post("/edit", postAdminEdit);

router.post("/status/:id", postAdminStatus);


export default router;
