import Order from "../models/OrderModel.js";
import Commerce from "../models/CommerceModel.js";
import Product from "../models/ProductModel.js";
import User from "../models/UserModel.js";
import { Roles } from "../utils/enums/roles.js";

// GET /api/admin/dashboard
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

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
        createdAt: { $gte: startOfToday }
      }),

      Commerce.countDocuments({ isActive: true }),
      Commerce.countDocuments({ isActive: false }),

      User.countDocuments({
        role: Roles.CLIENT,
        isActive: true
      }),

      User.countDocuments({
        role: Roles.CLIENT,
        isActive: false
      }),

      User.countDocuments({
        role: Roles.DELIVERY,
        isActive: true
      }),

      User.countDocuments({
        role: Roles.DELIVERY,
        isActive: false
      }),

      Product.countDocuments()
    ]);

    return res.status(200).json({
      orders: {
        total: totalOrders,
        today: todayOrders
      },
      commerces: {
        active: activeCommerces,
        inactive: inactiveCommerces
      },
      clients: {
        active: activeClients,
        inactive: inactiveClients
      },
      deliveries: {
        active: activeDeliveries,
        inactive: inactiveDeliveries
      },
      products: {
        total: totalProducts
      }
    });
  } catch (error) {
    return next(error);
  }
};