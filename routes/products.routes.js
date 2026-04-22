import express from "express";
import {
  CreateProduct,
  DeleteProduct,
  GetMyProducts,
  GetProductById,
  UpdateProduct
} from "../controllers/products.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { uploadProductImage } from "../middlewares/upload.middleware.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateCreateProduct,
  validateProductId,
  validateUpdateProduct
} from "./validations/products.validations.js";

const router = express.Router();

router.use(isAuth, requireRole(Roles.COMMERCE));

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener mis productos
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos del comercio autenticado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get("/", GetMyProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener un producto por id
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Producto no encontrado
 */
router.get(
  "/:id",
  validateProductId,
  handleValidationErrors(),
  GetProductById
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear producto
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, description, price, categoryId, image]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Categoria no encontrada
 */
router.post(
  "/",
  uploadProductImage,
  validateCreateProduct,
  handleValidationErrors(),
  CreateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar producto
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id del producto
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, description, price, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       400:
 *         description: Validacion fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Producto o categoria no encontrado
 */
router.put(
  "/:id",
  uploadProductImage,
  validateProductId,
  validateUpdateProduct,
  handleValidationErrors(),
  UpdateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Id del producto
 *     responses:
 *       204:
 *         description: Producto eliminado
 *       400:
 *         description: Id invalido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Producto no encontrado
 */
router.delete(
  "/:id",
  validateProductId,
  handleValidationErrors(),
  DeleteProduct
);

export default router;
