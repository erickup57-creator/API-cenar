import express from "express";
import {
  Login,
  RegisterClient,
  RegisterDelivery,
  RegisterCommerce,
  ConfirmEmail,
  ForgotPassword,
  ResetPassword
} from "../controllers/auth.controller.js";
import {
  validateLogin,
  validateRegisterClient,
  validateRegisterDelivery,
  validateRegisterCommerce,
  validateConfirmEmail,
  validateForgotPassword,
  validateResetPassword
} from "./validations/auth.validations.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { uploadProfileImage, uploadLogo } from "../middlewares/upload.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userNameOrEmail, password]
 *             properties:
 *               userNameOrEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas o cuenta inactiva
 */
router.post(
  "/login",
  validateLogin,
  handleValidationErrors(),
  Login
);

/**
 * @swagger
 * /api/auth/register-client:
 *   post:
 *     summary: Registro de cliente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, userName, email, password, confirmPassword, phone]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Cliente registrado correctamente
 *       400:
 *         description: Validación fallida
 *       409:
 *         description: Email o username ya en uso
 */
router.post(
  "/register-client",
  uploadProfileImage,
  validateRegisterClient,
  handleValidationErrors(),
  RegisterClient
);

/**
 * @swagger
 * /api/auth/register-delivery:
 *   post:
 *     summary: Registro de delivery
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, userName, email, password, confirmPassword, phone]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Delivery registrado correctamente
 *       400:
 *         description: Validación fallida
 *       409:
 *         description: Email o username ya en uso
 */
router.post(
  "/register-delivery",
  uploadProfileImage,
  validateRegisterDelivery,
  handleValidationErrors(),
  RegisterDelivery
);

/**
 * @swagger
 * /api/auth/register-commerce:
 *   post:
 *     summary: Registro de comercio
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [userName, email, password, confirmPassword, name, phone, openingTime, closingTime, commerceTypeId]
 *             properties:
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               openingTime:
 *                 type: string
 *               closingTime:
 *                 type: string
 *               commerceTypeId:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Comercio registrado correctamente
 *       400:
 *         description: Validación fallida
 *       409:
 *         description: Email ya en uso
 */
router.post(
  "/register-commerce",
  uploadLogo,
  validateRegisterCommerce,
  handleValidationErrors(),
  RegisterCommerce
);

/**
 * @swagger
 * /api/auth/confirm-email:
 *   post:
 *     summary: Confirmar cuenta con token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuenta activada correctamente
 *       400:
 *         description: Token inválido o expirado
 */
router.post(
  "/confirm-email",
  validateConfirmEmail,
  handleValidationErrors(),
  ConfirmEmail
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userNameOrEmail]
 *             properties:
 *               userNameOrEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Correo enviado si el usuario existe
 *       400:
 *         description: Validación fallida
 */
router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors(),
  ForgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña restablecida correctamente
 *       400:
 *         description: Token inválido o expirado
 */
router.post(
  "/reset-password",
  validateResetPassword,
  handleValidationErrors(),
  ResetPassword
);

export default router;