import express from "express";
import {
  CreateCategory,
  DeleteCategory,
  GetCategoryById,
  GetMyCategories,
  UpdateCategory
} from "../controllers/categories.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateCategoryBody,
  validateCategoryId
} from "./validations/categories.validations.js";

const router = express.Router();

router.use(isAuth, requireRole(Roles.COMMERCE));

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Obtener mis categorias
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias del comercio autenticado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get("/", GetMyCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Obtener una categoria por id
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la categoria
 *     responses:
 *       200:
 *         description: Categoria encontrada
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Categoria no encontrada
 */
router.get(
  "/:id",
  validateCategoryId,
  handleValidationErrors(),
  GetCategoryById
);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Crear categoria
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pizzas
 *               description:
 *                 type: string
 *                 example: Categoria de pizzas
 *     responses:
 *       201:
 *         description: Categoria creada
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.post(
  "/",
  validateCategoryBody,
  handleValidationErrors(),
  CreateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Actualizar categoria
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la categoria
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoria actualizada
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Categoria no encontrada
 */
router.put(
  "/:id",
  validateCategoryId,
  validateCategoryBody,
  handleValidationErrors(),
  UpdateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Eliminar categoria
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la categoria
 *     responses:
 *       204:
 *         description: Categoria eliminada
 *       400:
 *         description: Id invalido o categoria con productos asociados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Categoria no encontrada
 */
router.delete(
  "/:id",
  validateCategoryId,
  handleValidationErrors(),
  DeleteCategory
);

export default router;
