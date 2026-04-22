import express from "express";
import {
  getCommerceTypes,
  getCommerceTypeById,
  createCommerceType,
  updateCommerceType,
  deleteCommerceType
} from "../controllers/commerceType.controller.js";

import {
  validateCreateCommerceType,
  validateUpdateCommerceType,
  validateCommerceTypeId
} from "./validations/commerceType.validations.js";

import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { uploadCommerceTypeIcon } from "../middlewares/upload.middleware.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { Roles } from "../utils/enums/roles.js";

const router = express.Router();

router.use(isAuth);

/**
 * @swagger
 * /api/admin/commerce-types:
 *   get:
 *     summary: Obtener todos los tipos de comercio
 *     tags: [Commerce Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de comercio obtenida correctamente
 *       401:
 *         description: No autenticado
 */
router.get("/", getCommerceTypes);

/**
 * @swagger
 * /api/admin/commerce-types/{id}:
 *   get:
 *     summary: Obtener un tipo de comercio por ID
 *     tags: [Commerce Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tipo de comercio encontrado
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Commerce type no encontrado
 */
router.get(
  "/:id",
  validateCommerceTypeId,
  handleValidationErrors(),
  getCommerceTypeById
);

/**
 * @swagger
 * /api/admin/commerce-types:
 *   post:
 *     summary: Crear un tipo de comercio
 *     tags: [Commerce Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, icon]
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tipo de comercio creado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  "/",
  requireRole(Roles.ADMIN),
  uploadCommerceTypeIcon,
  validateCreateCommerceType,
  handleValidationErrors(),
  createCommerceType
);

/**
 * @swagger
 * /api/admin/commerce-types/{id}:
 *   put:
 *     summary: Actualizar un tipo de comercio
 *     tags: [Commerce Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Tipo de comercio actualizado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Commerce type no encontrado
 */
router.put(
  "/:id",
  requireRole(Roles.ADMIN),
  uploadCommerceTypeIcon,
  validateUpdateCommerceType,
  handleValidationErrors(),
  updateCommerceType
);

/**
 * @swagger
 * /api/admin/commerce-types/{id}:
 *   delete:
 *     summary: Eliminar un tipo de comercio y toda la información asociada
 *     description: Ejecuta eliminación física en cascada de comercios, productos, categorías, pedidos y favoritos relacionados.
 *     tags: [Commerce Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Tipo de comercio eliminado correctamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Commerce type no encontrado
 */
router.delete(
  "/:id",
  requireRole(Roles.ADMIN),
  validateCommerceTypeId,
  handleValidationErrors(),
  deleteCommerceType
);

export default router;