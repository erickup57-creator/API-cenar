import express from 'express';
import { getDeliveryDashboard, postStatusDelivery } from '../controllers/DeliveryDashboard.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { Roles } from '../utils/enums/roles.js';


const router = express.Router();

router.use(requireAuth, requireRole(Roles.ADMIN));

router.get("/", getDeliveryDashboard);
router.post("/status/:id", postStatusDelivery);

export default router;
