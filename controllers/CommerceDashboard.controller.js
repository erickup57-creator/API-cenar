import Commerce from "../models/CommerceModel.js";
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

export async function getCommerceDashboard(req, res, next) {
  try {
    const result = await Commerce.find(
      { role: Roles.COMMERCE },
      {
        name: 1,
        profileImage: 1,
        isActive: 1,
        phone: 1,
        openingTime: 1,
        closingTime: 1,
        email: 1
      }
    ).lean();

    const commerces = await Promise.all(
      result.map(async (commerce) => {
        const ordersCount = await Order.countDocuments({
          commerceId: commerce._id
        });

        return {
          ...commerce,
          ordersCount,
          profileImageUrl: resolveImageUrl(commerce.profileImage, "/Images/profileImages")
        };
      })
    );

    return res.render("AdminCommerce/index", {
      commercesList: commerces,
      hasCommerces: commerces.length > 0,
      layout: "admin-layout",
      "page-title": "Commerce Dashboard"
    });
  } catch (err) {
    console.error("Error loading commerce dashboard:", err);
    req.flash("error", "Error al cargar el dashboard del comercio.");
    return res.redirect("/AdminCommerce");
  }
}

export async function postStatus(req, res, next) {
  try {
    const commerceId = req.params.id;
    const status = req.body.status === "true";

    await Commerce.findByIdAndUpdate(commerceId, { isActive: status });
    req.flash("success", "Commerce status updated successfully.");
    return res.redirect("/AdminCommerce");
  } catch (err) {
    console.error("Error updating commerce status:", err);
    req.flash("error", "An error occurred while updating commerce status.");
    return res.redirect("/AdminCommerce");
  }
}
