import express from "express";
import {
  getConfigurations,
  getConfigurationByKey,
  updateConfiguration
} from "../controllers/configuration.controller.js";

import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import {
  validateConfigurationKey,
  validateUpdateConfiguration
} from "./validations/configuration.validations.js";
import { Roles } from "../utils/enums/roles.js";

const router = express.Router();

router.use(isAuth);
router.use(requireRole(Roles.ADMIN));

/**
 * @swagger
 * /api/configurations:
 *   get:
 *     summary: Obtener todas las configuraciones
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuraciones obtenidas correctamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get("/", getConfigurations);

/**
 * @swagger
 * /api/configurations/{key}:
 *   get:
 *     summary: Obtener una configuración por key
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           example: ITBIS
 *     responses:
 *       200:
 *         description: Configuración encontrada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Configuración no encontrada
 */
router.get(
  "/:key",
  validateConfigurationKey,
  handleValidationErrors(),
  getConfigurationByKey
);

/**
 * @swagger
 * /api/configurations/{key}:
 *   put:
 *     summary: Actualizar una configuración
 *     tags: [Configurations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           example: ITBIS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key:
 *                 type: string
 *                 example: ITBIS
 *               value:
 *                 type: string
 *                 example: "18"
 *     responses:
 *       200:
 *         description: Configuración actualizada correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Configuración no encontrada
 */
router.put(
  "/:key",
  validateUpdateConfiguration,
  handleValidationErrors(),
  updateConfiguration
);

export default router;