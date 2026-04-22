import Delivery from "../models/DeliveryModel.js";
import { Roles } from "../utils/enums/roles.js";
import Orders from "../models/OrderModel.js";

function resolveImageUrl(fileName, fallbackPrefix) {
  if (!fileName || typeof fileName !== "string") return null;

  const normalized = fileName.trim().replace(/\\/g, "/");
  if (!normalized) return null;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  if (normalized.startsWith("public/")) {
    return `/${normalized.slice("public/".length)}`;
  }

  if (normalized.startsWith("Images/")) {
    return `/${normalized}`;
  }

  return `${fallbackPrefix}/${normalized}`;
}

export async function getDeliveryDashboard(req, res, next) {
  try {
    const result = await Delivery.find(
      { role: Roles.DELIVERY },
      { name: 1, lastName: 1, email: 1, phone: 1, profileImage: 1, isActive: 1 }
    ).lean();

    const deliveries = await Promise.all(
      (result || []).map(async (delivery) => ({
        ...delivery,
        profileImageUrl: resolveImageUrl(delivery.profileImage, "/Images/profileImages"),
        ordersCount: await Orders.countDocuments({
          deliveryId: delivery._id,
          status: "completado"
        })
      }))
    );

    return res.render("AdminDelivery/index", {
      deliveriesList: deliveries,
      hasDeliveries: deliveries.length > 0,
      layout: "admin-layout",
      "page-title": "Delivery Dashboard"
    });
  } catch (error) {
    console.error("Error fetching delivery dashboard data:", error);
    req.flash("error", "Error al cargar el listado de delivery.");
    return res.redirect("/AdminDelivery");
  }
}

export async function postStatusDelivery(req, res, next) {
  const deliveryId = req.params.id;
  const status = req.body.status === "true";

  try {
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { isActive: status },
      { new: true }
    );

    if (!updatedDelivery) {
      req.flash("error", "Delivery no encontrado.");
      return res.redirect("/AdminDelivery");
    }

    req.flash(
      "success",
      status
        ? "Delivery activado correctamente."
        : "Delivery desactivado correctamente."
    );
    return res.redirect("/AdminDelivery");
  } catch (error) {
    console.error("Error updating delivery status:", error);
    req.flash("error", "Ocurrio un error al actualizar el estado del delivery.");
    return res.redirect("/AdminDelivery");
  }
}
