import Commerce from "../models/CommerceModel.js";
import CommerceType from "../models/CommerceTypeModel.js";
import Product from "../models/ProductModel.js";
import Favorite from "../models/FavoriteModel.js";

export async function GetCommerceTypes(req, res, next) {
  try {
    const { page = 1, pageSize = 10, search, sortBy = "name", sortDirection = "asc" } = req.query;

    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (Number(page) - 1) * Number(pageSize);
    const sort = { [sortBy]: sortDirection === "desc" ? -1 : 1 };

    const [commerceTypes, total] = await Promise.all([
      CommerceType.find(filter).sort(sort).skip(skip).limit(Number(pageSize)).lean(),
      CommerceType.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: commerceTypes,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetCommercesByType(req, res, next) {
  try {
    const { commerceTypeId, search, page = 1, pageSize = 10, sortBy = "name", sortDirection = "asc" } = req.query;

    const filter = { isActive: true };
    if (commerceTypeId) filter.commerceType = commerceTypeId;
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (Number(page) - 1) * Number(pageSize);
    const sort = { [sortBy]: sortDirection === "desc" ? -1 : 1 };

    const [commerces, total] = await Promise.all([
      Commerce.find(filter)
        .select("-password -activateToken -resetToken -resetTokenExpiration")
        .sort(sort)
        .skip(skip)
        .limit(Number(pageSize))
        .lean(),
      Commerce.countDocuments(filter)
    ]);

    const favorites = await Favorite.find({ userId: req.user.id }).select("commerceId").lean();
    const favoriteIds = new Set(favorites.map(f => String(f.commerceId)));

    const data = commerces.map(commerce => ({
      ...commerce,
      isFavorite: favoriteIds.has(String(commerce._id))
    }));

    return res.status(200).json({
      data,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function GetCommerceCatalog(req, res, next) {
  try {
    const { commerceId } = req.params;

    const commerce = await Commerce.findOne({ _id: commerceId, isActive: true })
      .select("-password -activateToken -resetToken -resetTokenExpiration")
      .lean();

    if (!commerce) {
      const error = new Error("Comercio no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    const products = await Product.find({ commerceId })
      .populate({ path: "categoryId", select: "name description" })
      .lean();

    const grouped = {};
    for (const product of products) {
      const categoryName = product.categoryId?.name ?? "Sin categoría";
      const categoryId = String(product.categoryId?._id ?? "uncategorized");

      if (!grouped[categoryId]) {
        grouped[categoryId] = {
          category: {
            id: categoryId,
            name: categoryName,
            description: product.categoryId?.description ?? ""
          },
          products: []
        };
      }

      grouped[categoryId].products.push({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image
      });
    }

    return res.status(200).json({
      commerce,
      catalog: Object.values(grouped)
    });
  } catch (error) {
    return next(error);
  }
}