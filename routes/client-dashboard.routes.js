import express from 'express';
import { getClientsDashboard, postStatusClient } from '../controllers/ClientDashboard.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { Roles } from '../utils/enums/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole(Roles.ADMIN));

router.get('/', getClientsDashboard);
router.post('/status/:id', postStatusClient);


export default router;
