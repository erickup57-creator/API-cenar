import express from "express";
import {
  CreateOrder,
  GetMyOrders,
  GetMyOrderDetail,
  GetCommerceOrders,
  GetCommerceOrderDetail,
  AssignDelivery,
  GetDeliveryOrders,
  GetDeliveryOrderDetail,
  CompleteOrder
} from "../controllers/orders.controller.js";
import isAuth, { requireRole } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/handleValidation.js";
import { Roles } from "../utils/enums/roles.js";
import {
  validateCreateOrder,
  validateOrderId,
  validateOrdersQuery
} from "./validations/orders.validations.js";

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear pedido
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId, items]
 *             properties:
 *               addressId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Pedido creado correctamente
 *       400:
 *         description: Validación fallida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Dirección o producto no encontrado
 */
router.post(
  "/",
  isAuth,
  requireRole(Roles.CLIENT),
  validateCreateOrder,
  handleValidationErrors(),
  CreateOrder
);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Obtener mis pedidos (cliente)
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, en proceso, completado]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos del cliente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get(
  "/my-orders",
  isAuth,
  requireRole(Roles.CLIENT),
  validateOrdersQuery,
  handleValidationErrors(),
  GetMyOrders
);

/**
 * @swagger
 * /api/orders/my-orders/{id}:
 *   get:
 *     summary: Obtener detalle de un pedido (cliente)
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del pedido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  "/my-orders/:id",
  isAuth,
  requireRole(Roles.CLIENT),
  validateOrderId,
  handleValidationErrors(),
  GetMyOrderDetail
);

/**
 * @swagger
 * /api/orders/commerce:
 *   get:
 *     summary: Obtener pedidos del comercio
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, en proceso, completado]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos del comercio
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get(
  "/commerce",
  isAuth,
  requireRole(Roles.COMMERCE),
  validateOrdersQuery,
  handleValidationErrors(),
  GetCommerceOrders
);

/**
 * @swagger
 * /api/orders/commerce/{id}:
 *   get:
 *     summary: Obtener detalle de un pedido del comercio
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del pedido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  "/commerce/:id",
  isAuth,
  requireRole(Roles.COMMERCE),
  validateOrderId,
  handleValidationErrors(),
  GetCommerceOrderDetail
);

/**
 * @swagger
 * /api/orders/{id}/assign-delivery:
 *   patch:
 *     summary: Asignar delivery a un pedido
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery asignado correctamente
 *       400:
 *         description: Pedido no está pendiente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Pedido no encontrado
 *       409:
 *         description: No hay delivery disponible
 */
router.patch(
  "/:id/assign-delivery",
  isAuth,
  requireRole(Roles.COMMERCE),
  validateOrderId,
  handleValidationErrors(),
  AssignDelivery
);

/**
 * @swagger
 * /api/orders/delivery:
 *   get:
 *     summary: Obtener pedidos del delivery
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendiente, en proceso, completado]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos del delivery
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 */
router.get(
  "/delivery",
  isAuth,
  requireRole(Roles.DELIVERY),
  validateOrdersQuery,
  handleValidationErrors(),
  GetDeliveryOrders
);

/**
 * @swagger
 * /api/orders/delivery/{id}:
 *   get:
 *     summary: Obtener detalle de un pedido del delivery
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del pedido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Pedido no encontrado
 */
router.get(
  "/delivery/:id",
  isAuth,
  requireRole(Roles.DELIVERY),
  validateOrderId,
  handleValidationErrors(),
  GetDeliveryOrderDetail
);

/**
 * @swagger
 * /api/orders/{id}/complete:
 *   patch:
 *     summary: Completar un pedido
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido completado correctamente
 *       400:
 *         description: Pedido no está en proceso
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Pedido no encontrado
 */
router.patch(
  "/:id/complete",
  isAuth,
  requireRole(Roles.DELIVERY),
  validateOrderId,
  handleValidationErrors(),
  CompleteOrder
);

export default router;