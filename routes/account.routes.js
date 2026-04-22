import express from "express";
import { GetProfile, UpdateProfile } from "../controllers/account.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { uploadProfileImage, uploadLogo } from "../middlewares/upload.middleware.js";
import { validateUpdateClient, validateUpdateCommerce } from "./validations/account.validations.js";
import { Roles } from "../utils/enums/roles.js";

const router = express.Router();

function uploadByRole(req, res, next) {
  const role = req.user?.role;
  if (role === Roles.COMMERCE) {
    return uploadLogo(req, res, next);
  }
  return uploadProfileImage(req, res, next);
}

function validateByRole(req, res, next) {
  const role = req.user?.role;
  if (role === Roles.COMMERCE) {
    return validateUpdateCommerce(req, res, next);
  }
  return validateUpdateClient(req, res, next);
}

/**
 * @swagger
 * /api/account/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Account]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 */
router.get("/me", isAuth, GetProfile);

/**
 * @swagger
 * /api/account/me:
 *   patch:
 *     summary: Actualizar perfil del usuario autenticado
 *     tags: [Account]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               email:
 *                 type: string
 *               openingTime:
 *                 type: string
 *               closingTime:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *       400:
 *         description: Validación fallida
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch("/me", isAuth, uploadByRole, validateByRole, handleValidationErrors(), UpdateProfile);

export default router;