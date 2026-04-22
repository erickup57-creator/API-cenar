import { getHomeDashboard } from '../controllers/AdminDashboard.controller.js';
import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { Roles } from '../utils/enums/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole(Roles.ADMIN));

router.get('/', getHomeDashboard);

export default router;
