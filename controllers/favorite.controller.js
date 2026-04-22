import Favorite from "../models/FavoriteModel.js";

export async function getFavoritesByClient(userId) {
  return await Favorite.find({ userId })
    .populate({ path: "commerceId", model: "Commerce", select: "name profileImage" })
    .sort({ createdAt: -1 })
    .lean();
}

export async function PostCreate(req, res, next) {
  const { CommerceId } = req.body;

  try {
    const isFavorite = await Favorite.findOne({
      userId: req.session.user._id,
      commerceId: CommerceId
    });

    if (isFavorite) {
      req.flash("errors", "El comercio ya esta en tus favoritos");
      return res.redirect("/client/favorites");
    }

    await Favorite.create({
      userId: req.session.user._id,
      commerceId: CommerceId
    });

    req.flash("success", "Agregado a favoritos exitosamente");
    return res.redirect("/client/favorites");
  } catch (err) {
    console.error("Error creating favorite:", err);
    req.flash("errors", "Error al agregar a favoritos");
    return res.redirect("/client/favorites");
  }
}

export async function PostDelete(req, res, next) {
  const { FavoriteId } = req.body;

  try {
    const favorite = await Favorite.findOneAndDelete({
      _id: FavoriteId,
      userId: req.session.user._id
    });

    if (!favorite) {
      req.flash("errors", "Favorito no encontrado");
      return res.redirect("/client/favorites");
    }

    req.flash("success", "Eliminado de favoritos exitosamente");
    return res.redirect("/client/favorites");
  } catch (err) {
    console.error("Error deleting favorite:", err);
    req.flash("errors", "Error al eliminar de favoritos");
    return res.redirect("/client/favorites");
  }
}
