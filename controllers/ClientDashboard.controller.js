import Users from "../models/UserModel.js";
import Order from "../models/OrderModel.js";
import { Roles } from "../utils/enums/roles.js";

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

export async function getClientsDashboard(req, res, next) {
  try {
    const result = await Users.find(
      { role: Roles.CLIENT },
      { name: 1, lastName: 1, email: 1, phone: 1, profileImage: 1, isActive: 1 },
    ).lean();

    for (const client of result) {
      client.profileImageUrl = resolveImageUrl(client.profileImage, "/Images/profileImages");
      client.ordersCount = await Order.countDocuments({ clientId: client._id });
    }

    const clients = result || [];

    res.render("AdminClient/index", {
      clientsList: clients,
      hasClients: clients.length > 0,
      layout: "admin-layout",
      title: "Client Dashboard",
    });
  } catch (err) {
    console.error("Error loading client dashboard:", err);
    req.flash("error", "Error al cargar el dashboard del cliente.");
    return res.redirect("AdminClient/index");
  }
}

export async function postStatusClient(req, res, next) {
  const clientId = req.params.id;
  const status = req.body.status === "true";

  try {
    await Users.findByIdAndUpdate(clientId, { isActive: status });

    req.flash(
      "success",
      status
        ? "Cliente activado correctamente."
        : "Cliente desactivado correctamente."
    );

    return res.redirect("/AdminClient");
  } catch (error) {
    console.error("Error updating client status:", error);

    req.flash(
      "error",
      "Ocurrió un error al actualizar el estado del cliente."
    );

    return res.redirect("AdminClient/index");
  }
}
