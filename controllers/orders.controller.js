import mongoose from "mongoose";
import Orders from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import Addresses from "../models/AddressModel.js";
import Configuration from "../models/ConfigurationModel.js";
import Delivery from "../models/DeliveryModel.js";

function buildPagination(query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const pageSize = Math.max(parseInt(query.pageSize) || 10, 1);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

function buildSort(query) {
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? 1 : -1;
  return { [sortBy]: sortDirection };
}

export async function CreateOrder(req, res, next) {
  try {
    const { addressId, items } = req.body;
    const clientId = req.user.id;

    const address = await Addresses.findOne({ _id: addressId, userId: clientId });
    if (!address) {
      const error = new Error("La dirección no existe o no pertenece al cliente.");
      error.statusCode = 404;
      return next(error);
    }

    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    if (products.length !== productIds.length) {
      const error = new Error("Uno o más productos no existen.");
      error.statusCode = 400;
      return next(error);
    }

    const commerceIds = [...new Set(products.map(p => String(p.commerceId)))];
    if (commerceIds.length > 1) {
      const error = new Error("Todos los productos deben pertenecer al mismo comercio.");
      error.statusCode = 400;
      return next(error);
    }

    const commerceId = commerceIds[0];

    const config = await Configuration.findOne().lean();
    const itbisRate = config?.itbis ?? 18;

    const orderProducts = items.map(item => {
      const product = products.find(p => String(p._id) === String(item.productId));
      return {
        productId: product._id,
        name: product.name,
        price: product.price * item.quantity,
        image: product.image ?? null
      };
    });

    const subtotal = orderProducts.reduce((sum, p) => sum + p.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    const order = await Orders.create({
      clientId,
      commerceId,
      addressId,
      products: orderProducts,
      subtotal,
      itbis: itbisAmount,
      total,
      status: "pendiente"
    });

    return res.status(201).json({
      id: order._id,
      status: order.status,
      commerceId,
      clientId,
      addressId,
      subtotal,
      itbisPercentage: itbisRate,
      itbisAmount,
      total,
      createdAt: order.createdAt
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetMyOrders(req, res, next) {
  try {
    const { page, pageSize, skip } = buildPagination(req.query);
    const sort = buildSort(req.query);
    const filter = { clientId: req.user.id };

    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Orders.find(filter)
        .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Orders.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: orders.map(order => ({
        id: order._id,
        commerce: order.commerceId,
        status: order.status,
        total: order.total,
        productsCount: order.products.length,
        createdAt: order.createdAt
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetMyOrderDetail(req, res, next) {
  try {
    const order = await Orders.findOne({ _id: req.params.id, clientId: req.user.id })
      .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
      .lean();

    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
}

export async function GetCommerceOrders(req, res, next) {
  try {
    const { page, pageSize, skip } = buildPagination(req.query);
    const sort = buildSort(req.query);
    const filter = { commerceId: req.user.id };

    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Orders.find(filter)
        .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Orders.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: orders.map(order => ({
        id: order._id,
        commerce: order.commerceId,
        status: order.status,
        total: order.total,
        productsCount: order.products.length,
        createdAt: order.createdAt
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetCommerceOrderDetail(req, res, next) {
  try {
    const order = await Orders.findOne({ _id: req.params.id, commerceId: req.user.id })
      .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
      .populate({ path: "deliveryId", model: "Delivery", select: "name lastName email" })
      .lean();

    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
}

export async function AssignDelivery(req, res, next) {
  try {
    const order = await Orders.findOne({ _id: req.params.id, commerceId: req.user.id });

    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    if (order.status !== "pendiente") {
      const error = new Error("Solo se puede asignar delivery a pedidos pendientes.");
      error.statusCode = 400;
      return next(error);
    }

    const busyDeliveries = await Orders.distinct("deliveryId", { status: "en proceso" });

    const delivery = await Delivery.findOne({
      isActive: true,
      deliveryStatus: "disponible",
      _id: { $nin: busyDeliveries }
    });

    if (!delivery) {
      const error = new Error("No hay delivery disponible en este momento.");
      error.statusCode = 409;
      return next(error);
    }

    order.deliveryId = delivery._id;
    order.status = "en proceso";
    await order.save();

    delivery.deliveryStatus = "ocupado";
    await delivery.save();

    return res.status(200).json({
      message: "Delivery asignado correctamente.",
      deliveryId: delivery._id,
      orderId: order._id,
      status: order.status
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetDeliveryOrders(req, res, next) {
  try {
    const { page, pageSize, skip } = buildPagination(req.query);
    const sort = buildSort(req.query);
    const filter = { deliveryId: req.user.id };

    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Orders.find(filter)
        .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Orders.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: orders.map(order => ({
        id: order._id,
        commerce: order.commerceId,
        status: order.status,
        total: order.total,
        productsCount: order.products.length,
        createdAt: order.createdAt
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetDeliveryOrderDetail(req, res, next) {
  try {
    const order = await Orders.findOne({ _id: req.params.id, deliveryId: req.user.id })
      .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
      .populate({ path: "addressId", model: "Addresses", select: "label street sector city reference" })
      .lean();

    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    const response = { ...order };

    if (order.status === "completado") {
      delete response.addressId;
    }

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
}

export async function CompleteOrder(req, res, next) {
  try {
    const order = await Orders.findOne({ _id: req.params.id, deliveryId: req.user.id });

    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    if (order.status !== "en proceso") {
      const error = new Error("Solo se pueden completar pedidos en proceso.");
      error.statusCode = 400;
      return next(error);
    }

    order.status = "completado";
    await order.save();

    const hasAnotherInProcess = await Orders.exists({
      deliveryId: req.user.id,
      status: "en proceso"
    });

    await Delivery.findByIdAndUpdate(req.user.id, {
      deliveryStatus: hasAnotherInProcess ? "ocupado" : "disponible"
    });

    return res.status(200).json({
      message: "Pedido completado correctamente.",
      orderId: order._id,
      status: order.status
    });
  } catch (error) {
    return next(error);
  }
}