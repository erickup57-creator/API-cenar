import express from "express";
import {
  GetMyAddresses,
  GetAddressById,
  CreateAddress,
  UpdateAddress,
  DeleteAddress
} from "../controllers/addresses.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateAddressBody,
  validateAddressId
} from "./validations/addresses.validations.js";

const router = express.Router();

router.use(isAuth, requireRole(Roles.CLIENT));

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Obtener mis direcciones
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de direcciones del cliente autenticado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get("/", GetMyAddresses);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Obtener una direccion por id
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la direccion
 *     responses:
 *       200:
 *         description: Direccion encontrada
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Direccion no encontrada
 */
router.get(
  "/:id",
  validateAddressId,
  handleValidationErrors(),
  GetAddressById
);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Crear direccion
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, street, sector, city, reference]
 *             properties:
 *               label:
 *                 type: string
 *                 example: Casa
 *               street:
 *                 type: string
 *                 example: Calle 27 #10
 *               sector:
 *                 type: string
 *                 example: Mirador Norte
 *               city:
 *                 type: string
 *                 example: Santo Domingo
 *               reference:
 *                 type: string
 *                 example: Apt 3B
 *     responses:
 *       201:
 *         description: Direccion creada
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.post(
  "/",
  validateAddressBody,
  handleValidationErrors(),
  CreateAddress
);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Actualizar direccion
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la direccion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, street, sector, city, reference]
 *             properties:
 *               label:
 *                 type: string
 *                 example: Casa
 *               street:
 *                 type: string
 *                 example: Calle 27 #10
 *               sector:
 *                 type: string
 *                 example: Mirador Norte
 *               city:
 *                 type: string
 *                 example: Santo Domingo
 *               reference:
 *                 type: string
 *                 example: Apt 3B
 *     responses:
 *       200:
 *         description: Direccion actualizada
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Direccion no encontrada
 */
router.put(
  "/:id",
  validateAddressId,
  validateAddressBody,
  handleValidationErrors(),
  UpdateAddress
);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Eliminar direccion
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id de la direccion
 *     responses:
 *       204:
 *         description: Direccion eliminada
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Direccion no encontrada
 */
router.delete(
  "/:id",
  validateAddressId,
  handleValidationErrors(),
  DeleteAddress
);

export default router;
