import { completeOrderByDelivery, getDeliveryOrderById, getOrdersByDelivery } from "./orders.controller.js";
import { unlink } from "node:fs/promises";
import path from "node:path";
import Delivery from "../models/DeliveryModel.js";
import { projectRoot } from "../utils/Paths.js";

function getDeliveryViewModel(req, title) {
  return {
    layout: "delivery-layout",
    title,
    user: req.session?.user ?? null
  };
}

function formatDOP(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP"
  });
}

function formatDateTime(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resolveImageUrl(fileName, fallbackPrefix) {
  if (!fileName || typeof fileName !== "string") return null;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.startsWith("/")) {
    return fileName;
  }

  return `${fallbackPrefix}/${fileName}`;
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}

async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.error("Error deleting uploaded profile image:", err);
    }
  }
}

async function removePreviousProfileImage(fileName) {
  if (!fileName || typeof fileName !== "string") return;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.includes("/") || fileName.includes("\\")) {
    return;
  }

  const imagePath = path.join(projectRoot, "public", "Images", "profileImages", fileName);
  await removeUploadedFile(imagePath);
}

function getSessionDeliveryId(req) {
  return req.session?.user?._id || req.session?.user?.id || null;
}

function buildProfileFormData(delivery, override = {}) {
  return {
    name: override.name ?? delivery?.name ?? "",
    lastName: override.lastName ?? delivery?.lastName ?? "",
    phone: override.phone ?? delivery?.phone ?? ""
  };
}

function getStatusBadgeClass(status) {
  if (status === "en proceso") return "text-bg-primary";
  if (status === "completado") return "text-bg-success";
  return "text-bg-warning";
}

function getStatusLabel(status) {
  if (status === "en proceso") return "En proceso";
  if (status === "completado") return "Completado";
  return "Pendiente";
}

function buildAddressLabel(addressData) {
  if (!addressData || typeof addressData !== "object") return "Direccion no disponible";
  const addressName = sanitizeText(addressData.name);
  const description = sanitizeText(addressData.description);

  if (addressName && description) return `${addressName} - ${description}`;
  if (addressName) return addressName;
  if (description) return description;
  return "Direccion no disponible";
}

export async function getDashboard(req, res) {
  const sessionDeliveryId = getSessionDeliveryId(req);

  if (!sessionDeliveryId) {
    return res.redirect("/user/login");
  }

  try {
    const orders = await getOrdersByDelivery(sessionDeliveryId);
    const mappedOrders = orders.map((order) => {
      const commerceData = order?.commerceId;
      const commerceName =
        commerceData && typeof commerceData === "object"
          ? commerceData.name || commerceData.email || "Comercio"
          : "Comercio";

      return {
        id: String(order?._id || ""),
        status: order?.status || "pendiente",
        statusBadgeClass: getStatusBadgeClass(order?.status),
        statusLabel: getStatusLabel(order?.status),
        commerceName,
        commerceLogoUrl: resolveImageUrl(commerceData?.profileImage, "/Images/profileImages"),
        totalLabel: formatDOP(order?.total),
        productsCount: Array.isArray(order?.products) ? order.products.length : 0,
        createdAtLabel: formatDateTime(order?.createdAt)
      };
    });

    return res.render("delivery/dashboard/index", {
      ...getDeliveryViewModel(req, "Home del delivery"),
      ordersList: mappedOrders,
      hasOrders: mappedOrders.length > 0
    });
  } catch (err) {
    console.error("Error fetching delivery orders:", err);
    return res.status(500).render("delivery/dashboard/index", {
      ...getDeliveryViewModel(req, "Home del delivery"),
      ordersList: [],
      hasOrders: false,
      loadError: true
    });
  }
}

export async function getOrderDetail(req, res) {
  const sessionDeliveryId = getSessionDeliveryId(req);
  const orderId = req.params?.orderId;

  if (!sessionDeliveryId) {
    return res.redirect("/user/login");
  }

  try {
    const order = await getDeliveryOrderById(orderId, sessionDeliveryId);
    const successMessages = req.flash("success");
    const errorMessages = req.flash("errors");

    if (!order) {
      return res.status(404).render("delivery/order-detail", {
        ...getDeliveryViewModel(req, "Detalle del pedido"),
        notFound: true,
        successMessages,
        errorMessages
      });
    }

    const commerceData = order?.commerceId && typeof order.commerceId === "object" ? order.commerceId : null;
    const mappedOrder = {
      id: String(order._id),
      status: order.status || "pendiente",
      statusBadgeClass: getStatusBadgeClass(order.status),
      statusLabel: getStatusLabel(order.status),
      commerceName: commerceData?.name || commerceData?.email || "Comercio",
      commerceLogoUrl: resolveImageUrl(commerceData?.profileImage, "/Images/profileImages"),
      createdAtLabel: formatDateTime(order.createdAt),
      totalLabel: formatDOP(order.total),
      deliveryAddressLabel: buildAddressLabel(order.addressId),
      productsList: Array.isArray(order.products)
        ? order.products.map((product) => ({
            imageUrl: resolveImageUrl(product?.image, "/Images/products"),
            name: product?.name || "Producto",
            priceLabel: formatDOP(product?.price)
          }))
        : []
    };

    return res.render("delivery/order-detail", {
      ...getDeliveryViewModel(req, "Detalle del pedido"),
      order: mappedOrder,
      productsList: mappedOrder.productsList,
      hasProducts: mappedOrder.productsList.length > 0,
      canCompleteOrder: mappedOrder.status === "en proceso",
      successMessages,
      errorMessages
    });
  } catch (err) {
    console.error("Error loading delivery order detail:", err);
    return res.status(500).render("delivery/order-detail", {
      ...getDeliveryViewModel(req, "Detalle del pedido"),
      loadError: true,
      successMessages: [],
      errorMessages: ["No se pudo cargar el detalle del pedido."]
    });
  }
}

export async function postCompleteOrder(req, res) {
  const sessionDeliveryId = getSessionDeliveryId(req);
  const orderId = req.params?.orderId;

  if (!sessionDeliveryId) {
    return res.redirect("/user/login");
  }

  const redirectPath = `/delivery/orders/${orderId}`;

  try {
    const result = await completeOrderByDelivery({
      orderId,
      deliveryId: sessionDeliveryId
    });

    if (!result.ok) {
      switch (result.code) {
        case "invalid_ids":
          req.flash("errors", "Datos invalidos del pedido.");
          break;
        case "order_not_found":
          req.flash("errors", "El pedido no existe o no esta asignado a tu cuenta.");
          break;
        case "already_completed":
          req.flash("errors", "Este pedido ya estaba completado.");
          break;
        case "invalid_status":
          req.flash("errors", "Solo puedes completar pedidos en proceso.");
          break;
        default:
          req.flash("errors", "No se pudo completar el pedido.");
      }

      return res.redirect(redirectPath);
    }

    req.flash("success", "Pedido completado correctamente.");
    return res.redirect(redirectPath);
  } catch (err) {
    console.error("Error completing delivery order:", err);
    req.flash("errors", "Error interno al completar el pedido.");
    return res.redirect(redirectPath);
  }
}

export async function getProfile(req, res) {
  const sessionDeliveryId = getSessionDeliveryId(req);

  if (!sessionDeliveryId) {
    return res.redirect("/user/login");
  }

  try {
    const delivery = await Delivery.findById(sessionDeliveryId).select("name lastName phone profileImage").lean();

    if (!delivery) {
      req.flash("errors", "No se encontro el delivery logueado.");
      return res.redirect("/user/login");
    }

    const successMessages = req.flash("success");
    const errorMessages = req.flash("errors");

    return res.render("delivery/profile", {
      ...getDeliveryViewModel(req, "Perfil del delivery"),
      formData: buildProfileFormData(delivery),
      profileImageUrl: resolveImageUrl(delivery.profileImage, "/Images/profileImages"),
      successMessages,
      errors: errorMessages
    });
  } catch (err) {
    console.error("Error loading delivery profile:", err);
    return res.status(500).render("delivery/profile", {
      ...getDeliveryViewModel(req, "Perfil del delivery"),
      formData: buildProfileFormData(null),
      profileImageUrl: null,
      successMessages: [],
      errors: ["No se pudo cargar la informacion del perfil."]
    });
  }
}

export async function postProfile(req, res) {
  const sessionDeliveryId = getSessionDeliveryId(req);

  if (!sessionDeliveryId) {
    await removeUploadedFile(req.file?.path);
    return res.redirect("/user/login");
  }

  try {
    const delivery = await Delivery.findById(sessionDeliveryId);

    if (!delivery) {
      await removeUploadedFile(req.file?.path);
      req.flash("errors", "No se encontro el delivery logueado.");
      return res.redirect("/user/login");
    }

    const formData = {
      name: sanitizeText(req.body?.name),
      lastName: sanitizeText(req.body?.lastName),
      phone: sanitizeText(req.body?.phone)
    };

    const errors = [];

    if (!formData.name) errors.push("El nombre es obligatorio.");
    if (!formData.lastName) errors.push("El apellido es obligatorio.");
    if (!formData.phone) errors.push("El telefono es obligatorio.");
    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).render("delivery/profile", {
        ...getDeliveryViewModel(req, "Perfil del delivery"),
        formData: buildProfileFormData(delivery, formData),
        profileImageUrl: resolveImageUrl(delivery.profileImage, "/Images/profileImages"),
        successMessages: [],
        errors
      });
    }

    const previousProfileImage = delivery.profileImage;

    delivery.name = formData.name;
    delivery.lastName = formData.lastName;
    delivery.phone = formData.phone;

    if (req.file?.filename) {
      delivery.profileImage = req.file.filename;
    }

    await delivery.save();

    if (req.file?.filename && previousProfileImage && previousProfileImage !== req.file.filename) {
      await removePreviousProfileImage(previousProfileImage);
    }

    if (req.session?.user) {
      req.session.user = {
        ...req.session.user,
        name: delivery.name,
        lastName: delivery.lastName,
        phone: delivery.phone,
        profileImage: delivery.profileImage
      };
    }

    req.flash("success", "Perfil actualizado correctamente.");
    return req.session.save((saveError) => {
      if (saveError) {
        console.error("Error saving session after delivery profile update:", saveError);
      }

      return res.redirect("/delivery/profile");
    });
  } catch (err) {
    console.error("Error updating delivery profile:", err);
    await removeUploadedFile(req.file?.path);

    return res.status(500).render("delivery/profile", {
      ...getDeliveryViewModel(req, "Perfil del delivery"),
      formData: {
        name: sanitizeText(req.body?.name),
        lastName: sanitizeText(req.body?.lastName),
        phone: sanitizeText(req.body?.phone)
      },
      profileImageUrl: null,
      successMessages: [],
      errors: ["No se pudo actualizar el perfil. Intenta nuevamente."]
    });
  }
}
