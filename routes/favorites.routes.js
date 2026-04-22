import express from "express";
import {
  AddFavorite,
  GetMyFavorites,
  RemoveFavorite
} from "../controllers/favorites.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateFavoriteBody,
  validateFavoriteCommerceId,
  validateFavoritesPagination
} from "./validations/favorites.validations.js";

const router = express.Router();

router.use(isAuth, requireRole(Roles.CLIENT));

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Obtener mis comercios favoritos
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Pagina solicitada
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Cantidad de favoritos por pagina
 *     responses:
 *       200:
 *         description: Lista paginada de favoritos
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get(
  "/",
  validateFavoritesPagination,
  handleValidationErrors(),
  GetMyFavorites
);

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Agregar comercio a favoritos
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commerceId]
 *             properties:
 *               commerceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Favorito creado
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Comercio no encontrado o inactivo
 *       409:
 *         description: Favorito duplicado
 */
router.post(
  "/",
  validateFavoriteBody,
  handleValidationErrors(),
  AddFavorite
);

/**
 * @swagger
 * /api/favorites/{commerceId}:
 *   delete:
 *     summary: Remover comercio de favoritos
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commerceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Id del comercio favorito
 *     responses:
 *       204:
 *         description: Favorito eliminado
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Favorito no encontrado
 */
router.delete(
  "/:commerceId",
  validateFavoriteCommerceId,
  handleValidationErrors(),
  RemoveFavorite
);

export default router;
