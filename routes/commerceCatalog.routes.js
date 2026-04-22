import express from "express";
import {
  GetCommerceTypes,
  GetCommercesByType,
  GetCommerceCatalog
} from "../controllers/commerceCatalog.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import { query, param } from "express-validator";

const router = express.Router();

router.use(isAuth, requireRole(Roles.CLIENT));

/**
 * @swagger
 * /api/commerce-types:
 *   get:
 *     summary: Obtener tipos de comercio
 *     tags: [Commerce Catalog]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Lista de tipos de comercio
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get("/commerce-types", GetCommerceTypes);

/**
 * @swagger
 * /api/commerce:
 *   get:
 *     summary: Obtener comercios activos
 *     tags: [Commerce Catalog]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: commerceTypeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Lista de comercios
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get("/commerce", GetCommercesByType);

/**
 * @swagger
 * /api/commerce/{commerceId}/catalog:
 *   get:
 *     summary: Obtener catálogo de productos de un comercio agrupado por categorías
 *     tags: [Commerce Catalog]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commerceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Catálogo del comercio
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Comercio no encontrado
 */
router.get(
  "/commerce/:commerceId/catalog",
  [
    param("commerceId")
      .isMongoId()
      .withMessage("El id del comercio no es válido.")
  ],
  handleValidationErrors(),
  GetCommerceCatalog
);

export default router;