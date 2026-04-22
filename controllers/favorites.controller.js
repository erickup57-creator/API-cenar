import Favorite from "../models/FavoriteModel.js";
import Commerce from "../models/CommerceModel.js";

const commercePublicFields = "-password -activateToken -resetToken -resetTokenExpiration";

function getPagination(query) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function conflictError() {
  const error = new Error("El comercio ya esta en favoritos.");
  error.statusCode = 409;
  return error;
}

export async function GetMyFavorites(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { userId: req.user.id };

    const [favorites, total] = await Promise.all([
      Favorite.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "commerceId",
          select: commercePublicFields
        })
        .lean(),
      Favorite.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: favorites.map((favorite) => ({
        id: favorite._id,
        commerce: favorite.commerceId,
        createdAt: favorite.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function AddFavorite(req, res, next) {
  try {
    const { commerceId } = req.body;

    const commerce = await Commerce.findOne({
      _id: commerceId,
      isActive: true
    })
      .select(commercePublicFields)
      .lean();

    if (!commerce) {
      const error = new Error("Comercio no encontrado o inactivo.");
      error.statusCode = 404;
      return next(error);
    }

    const favoriteExists = await Favorite.exists({
      userId: req.user.id,
      commerceId
    });

    if (favoriteExists) {
      return next(conflictError());
    }

    try {
      const favorite = await Favorite.create({
        userId: req.user.id,
        commerceId
      });

      return res.status(201).json({
        id: favorite._id,
        commerce,
        createdAt: favorite.createdAt
      });
    } catch (error) {
      if (error?.code === 11000) {
        return next(conflictError());
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
}

export async function RemoveFavorite(req, res, next) {
  try {
    const favorite = await Favorite.findOneAndDelete({
      userId: req.user.id,
      commerceId: req.params.commerceId
    });

    if (!favorite) {
      const error = new Error("Favorito no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
