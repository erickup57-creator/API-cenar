import Orders from "../models/OrderModel.js";
import Configuration from "../models/ConfigurationModel.js";
import Users from "../models/UserModel.js";
import Delivery from "../models/DeliveryModel.js";
import { Roles } from "../utils/enums/roles.js";
import mongoose from "mongoose";

export async function getOrdersByClient(clientId) {
  return await Orders.find({ clientId })
    .sort({ createdAt: -1 })
    .populate({ path: "commerceId", model: "Commerce", select: "name email" })
    .lean();
}

export async function getOrdersByCommerce(commerceId) {
  return await Orders.find({ commerceId })
    .sort({ createdAt: -1 })
    .populate({ path: "commerceId", model: "Commerce", select: "name profileImage email" })
    .lean();
}

export async function getOrdersByDelivery(deliveryId) {
  return await Orders.find({ deliveryId })
    .sort({ createdAt: -1 })
    .populate({ path: "commerceId", model: "Commerce", select: "name profileImage email" })
    .lean();
}

export async function getDeliveryOrderById(orderId, deliveryId) {
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(deliveryId)) {
    return null;
  }

  return await Orders.findOne({ _id: orderId, deliveryId })
    .populate({ path: "commerceId", model: "Commerce", select: "name profileImage email" })
    .populate({ path: "addressId", model: "Addresses", select: "name description" })
    .lean();
}

export async function getCommerceOrderById(orderId, commerceId) {
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(commerceId)) {
    return null;
  }

  return await Orders.findOne({ _id: orderId, commerceId })
    .populate({ path: "commerceId", model: "Commerce", select: "name profileImage email" })
    .populate({
      path: "deliveryId",
      model: "Delivery",
      select: "name lastName username email profileImage deliveryStatus"
    })
    .lean();
}

export async function getAvailableDeliveries() {
  const busyDeliveries = await Orders.distinct("deliveryId", { status: "en proceso" });

  return await Delivery.find({
    role: Roles.DELIVERY,
    isActive: true,
    deliveryStatus: "disponible",
    _id: { $nin: busyDeliveries }
  })
    .sort({ createdAt: -1 })
    .select("name lastName username email")
    .lean();
}

export async function assignDeliveryToCommerceOrder({ orderId, commerceId, deliveryId }) {
  const hasDeliveryId = typeof deliveryId === "string" && deliveryId.trim().length > 0;

  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(commerceId)) {
    return { ok: false, code: "invalid_ids" };
  }

  if (hasDeliveryId && !mongoose.Types.ObjectId.isValid(deliveryId)) {
    return { ok: false, code: "invalid_ids" };
  }

  const order = await Orders.findOne({ _id: orderId, commerceId });
  if (!order) return { ok: false, code: "order_not_found" };

  if (order.status !== "pendiente") return { ok: false, code: "invalid_status" };

  if (order.deliveryId) {
    return { ok: false, code: "delivery_already_assigned" };
  }

  let delivery = null;

  if (hasDeliveryId) {
    delivery = await Delivery.findOne({
      _id: deliveryId,
      role: Roles.DELIVERY,
      isActive: true,
      deliveryStatus: "disponible"
    });
  } else {
    const busyDeliveries = await Orders.distinct("deliveryId", { status: "en proceso" });
    delivery = await Delivery.findOne({
      role: Roles.DELIVERY,
      isActive: true,
      deliveryStatus: "disponible",
      _id: { $nin: busyDeliveries }
    }).sort({ createdAt: 1 });
  }

  if (!delivery) return { ok: false, code: "delivery_not_available" };

  const hasInProcessOrder = await Orders.exists({
    deliveryId: delivery._id,
    status: "en proceso"
  });

  if (hasInProcessOrder) {
    return { ok: false, code: "delivery_not_available" };
  }

  order.deliveryId = delivery._id;
  order.status = "en proceso";
  await order.save();

  delivery.deliveryStatus = "ocupado";
  await delivery.save();

  return { ok: true };
}


export async function completeOrderByDelivery({ orderId, deliveryId }) {
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(deliveryId)) {
    return { ok: false, code: "invalid_ids" };
  }

  const order = await Orders.findOne({ _id: orderId, deliveryId });
  if (!order) {
    return { ok: false, code: "order_not_found" };
  }

  if (order.status === "completado") {
    return { ok: false, code: "already_completed" };
  }

  if (order.status !== "en proceso") {
    return { ok: false, code: "invalid_status" };
  }

  order.status = "completado";
  await order.save();

  const hasAnotherInProcessOrder = await Orders.exists({
    deliveryId,
    status: "en proceso"
  });

  await Delivery.findByIdAndUpdate(deliveryId, {
    deliveryStatus: hasAnotherInProcessOrder ? "ocupado" : "disponible"
  });

  return { ok: true };
}


export async function PostCreate(req, res, next) {
  const { ClientId, DeliveryId, AddressId, Products: OrderProducts } = req.body;
  const sessionCommerceId = req.user?.id;

  try {
    if (!sessionCommerceId) {
      req.flash("errors", "Commerce session not found");
      return res.redirect("/user/login");
    }

    const parsedProducts = JSON.parse(OrderProducts);
    const clientObjectId = new mongoose.Types.ObjectId(ClientId);
    const deliveryObjectId = new mongoose.Types.ObjectId(DeliveryId);
    const addressObjectId = new mongoose.Types.ObjectId(AddressId);

    const [clientExists, delivery] = await Promise.all([
      Users.exists({ _id: clientObjectId, role: Roles.CLIENT }),
      Delivery.findOne({
        _id: deliveryObjectId,
        role: Roles.DELIVERY,
        isActive: true,
        deliveryStatus: "disponible"
      })
    ]);

    const deliveryHasInProcessOrder = await Orders.exists({
      deliveryId: deliveryObjectId,
      status: "en proceso"
    });

    const addressesCollection = mongoose.connection.db.collection("Addresses");
    const ownershipCandidates = [clientObjectId, ClientId];

    const addressBelongsToClient = await addressesCollection.findOne({
      _id: addressObjectId,
      $or: [
        { clientId: { $in: ownershipCandidates } },
        { userId: { $in: ownershipCandidates } },
        { ownerId: { $in: ownershipCandidates } },
        { client: { $in: ownershipCandidates } },
        { user: { $in: ownershipCandidates } },
        { owner: { $in: ownershipCandidates } }
      ]
    });

    const businessErrors = [];
    if (!clientExists) businessErrors.push("El cliente seleccionado no existe.");

    if (!delivery) businessErrors.push("El delivery seleccionado no esta disponible.");
    if (deliveryHasInProcessOrder) {
      businessErrors.push("El delivery seleccionado ya tiene un pedido en proceso.");
    }
    if (!addressBelongsToClient) {
      businessErrors.push("La direccion no existe o no pertenece al cliente seleccionado.");
    }

    if (businessErrors.length > 0) {
      req.flash("errors", businessErrors);
      return res.redirect("/commerce/dashboard");
    }

    const config = await Configuration.findOne().lean();
    const itbisRate = Configuration ? config.itbis : 18;
    const subtotal = parsedProducts.reduce((sum, p) => sum + p.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    await Orders.create({
      clientId: ClientId,
      commerceId: sessionCommerceId,
      deliveryId: DeliveryId,
      addressId: AddressId,
      products: parsedProducts,
      subtotal,
      itbis: itbisAmount,
      total,
      status: "en proceso"
    });

    delivery.deliveryStatus = "ocupado";
    await delivery.save();

    req.flash("success", "Orden creada y asignada correctamente");
    return res.redirect("/commerce/dashboard");
  } catch (err) {
    console.error("Error creating order:", err);
    req.flash("errors", "Error creating order");
    return res.redirect("/commerce/dashboard");
  }
}

// Crear orden desde cliente
export async function PostCreateClient(req, res, next) {
  const { CommerceId, AddressId, Products: OrderProducts } = req.body;
  const sessionClientId = req.user?.id;

  try {
    if (!sessionClientId) {
      req.flash("errors", "Client session not found");
      return res.redirect("/user/login");
    }

    const parsedProducts = JSON.parse(OrderProducts);
    const config = await Config.findOne().lean();
    const itbisRate = config ? config.itbis : 18;
    const subtotal = parsedProducts.reduce((sum, p) => sum + p.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    await Orders.create({
      clientId: sessionClientId,
      commerceId: CommerceId,
      addressId: AddressId,
      products: parsedProducts,
      subtotal,
      itbis: itbisAmount,
      total,
      status: "pendiente"
    });

    req.flash("success", "Pedido realizado correctamente");
    return res.redirect("/client/dashboard"
    );
  } catch (err) {
    console.error("Error creating client order:", err);
    req.flash("errors", "Error creating order");
    return res.redirect("/client/dashboard");
  }
}

export async function GetDetail(req, res, next) {
  const { orderId } = req.params;

  try {
    const order = await Orders.findById(orderId)
      .populate("commerceId")
      .populate("addressId")
      .lean();

    if (!order) {
      req.flash("errors", "Pedido no encontrado");
      return res.redirect("/client/orders");
    }

    return res.render("client/orders/detail", {  
      layout: "client-layout",                 
      title: "Detalle del pedido",
      user: req.session?.user ?? null,
      order
    });
  } catch (err) {
    console.error("Error fetching order detail:", err);
    req.flash("errors", "Error al cargar el detalle del pedido");
    return res.redirect("/client/orders");       
  }
}