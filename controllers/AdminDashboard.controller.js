import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import Commerce from "../models/CommerceModel.js";
import Users from "../models/UserModel.js";
import Delivery from "../models/DeliveryModel.js";
import { Roles } from "../utils/enums/roles.js";

function getTodayRange() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return { todayStart, tomorrowStart };
}

export async function getHomeDashboard(req, res, next) {
    try {
        const { todayStart, tomorrowStart } = getTodayRange();

        const [
            totalOrders,
            todayOrders,
            activeCommerces,
            inactiveCommerces,
            activeClients,
            inactiveClients,
            activeDeliveries,
            inactiveDeliveries,
            totalProducts
        ] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({
                createdAt: { $gte: todayStart, $lt: tomorrowStart }
            }),
            Commerce.countDocuments({ isActive: true }),
            Commerce.countDocuments({ isActive: false }),
            Users.countDocuments({ role: Roles.CLIENT, isActive: true }),
            Users.countDocuments({ role: Roles.CLIENT, isActive: false }),
            Delivery.countDocuments({ role: Roles.DELIVERY, isActive: true }),
            Delivery.countDocuments({ role: Roles.DELIVERY, isActive: false }),
            Product.countDocuments()
        ]);

        return res.render("AdminDashboard/Index", {
            totalOrders,
            todayOrders,
            activeCommerces,
            inactiveCommerces,
            activeClients,
            inactiveClients,
            activeDeliveries,
            inactiveDeliveries,
            totalProducts,
            layout: "admin-layout",
            title: "Admin Dashboard",
            "page-title": "Admin Dashboard"
        });
    } catch (err) {
        console.error("Error loading dashboard:", err);
        req.flash("error", "Error al cargar el dashboard.");
        return res.redirect("/AdminDashboard");
    }
}
