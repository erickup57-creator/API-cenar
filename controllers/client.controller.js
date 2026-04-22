import CommerceType from "../models/CommerceTypeModel.js";
import { getOrdersByClient } from "./orders.controller.js";
import { getCommercesByType } from "./commerce.controller.js";
import { getAddressesByUser } from "./address.controller.js";
import { getFavoritesByClient } from "./favorite.controller.js";
import { unlink } from "node:fs/promises";
import path from "node:path";
import Users from "../models/UserModel.js";
import { projectRoot } from "../utils/Paths.js";

// helper para eliminar archivos
async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (ex) {
    if (ex?.code !== "ENOENT") {
      console.error("Error deleting uploaded file", ex);
    }
  }
}

function getClientViewModel(req, title) {
  return {
    layout: "client-layout",
    title,
    user: req.session?.user ?? null
  };
}

function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}

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

function resolveProfileImagePath(fileName) {
  if (!fileName || typeof fileName !== "string") return null;

  const normalized = fileName.trim().replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return null;
  }

  if (normalized.startsWith("public/")) {
    return path.join(projectRoot, ...normalized.split("/"));
  }

  const cleanFileName = path.basename(normalized);
  return path.join(projectRoot, "public", "Images", "profileImages", cleanFileName);
}

function isCssIconClass(iconValue) {
  if (!iconValue || typeof iconValue !== "string") return false;

  const normalized = iconValue.trim();
  if (!normalized) return false;

  const hasPathLikeChars = /[\\/]/.test(normalized);
  const hasFileExtension = /\.[a-z0-9]+$/i.test(normalized);

  return !hasPathLikeChars && !hasFileExtension && /(fa-|bi-|\bbi\b)/i.test(normalized);
}

export async function getDashboard(req, res) {
  try {
    const rawCommerceTypes = await CommerceType.find().lean();
    const commerceTypes = (rawCommerceTypes || []).map((type) => {
      const rawIcon = typeof type.icon === "string" ? type.icon.trim() : "";

      if (isCssIconClass(rawIcon)) {
        return {
          ...type,
          iconClass: rawIcon,
          iconUrl: null
        };
      }

      return {
        ...type,
        iconClass: null,
        iconUrl: resolveImageUrl(rawIcon, "/Images/commerceTypeIcons")
      };
    });

    return res.render("client/dashboard/index", {
      ...getClientViewModel(req, "Inicio"),
      commerceTypes,
      hasCommerceTypes: commerceTypes.length > 0,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  } catch (ex) {
    console.error("Error loading dashboard:", ex);
    return res.render("client/dashboard/index", {
      ...getClientViewModel(req, "Inicio"),
      commerceTypes: [],
      hasCommerceTypes: false,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  }
}

export async function getCommercesByTypeView(req, res) {
  try {
    const { commerceTypeId } = req.params;
    const { search } = req.query;
    const sessionUserId = req.session?.user?._id;

    const { commerces, commerceType, total } = await getCommercesByType(commerceTypeId, search);

    // Obtener los favoritos del usuario para saber cuáles ya están guardados
    const favorites = await getFavoritesByClient(sessionUserId);
    const favoriteCommerceIds = new Set(favorites.map(f => String(f.commerceId)));

    const commercesConFavorito = commerces.map(c => ({
      ...c,
      logoUrl: resolveImageUrl(c.profileImage, "/Images/profileImages"),
      esFavorito: favoriteCommerceIds.has(String(c._id))
    }));

    return res.render("client/commerces", {
      ...getClientViewModel(req, commerceType?.name ?? "Comercios"),
      commerces: commercesConFavorito,
      commerceType,
      total,
      search: search ?? "",
      hasCommerces: commerces.length > 0
    });
  } catch (ex) {
    console.error("Error cargando comercios:", ex);
    return res.redirect("/client/dashboard");
  }
}

// render perfil con formData
export function getProfile(req, res) {
  const user = req.session.user;

  return res.render("client/profile", {
    ...getClientViewModel(req, "Mi perfil"),
    formData: {
      name: user.name,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage
    },
    profileImageUrl: resolveImageUrl(user.profileImage, "/Images/profileImages"),
    errors: [],
    success: false
  });
}

// actualizar perfil
export async function updateProfile(req, res) {
  const user = req.session.user;

  const formData = {
    name: req.body.name?.trim() ?? "",
    lastName: req.body.lastName?.trim() ?? "",
    username: user.username,
    email: user.email,
    phone: req.body.phone?.trim() ?? "",
    profileImage: user.profileImage
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

    return res.render("client/profile", {
      ...getClientViewModel(req, "Mi perfil"),
      formData,
      profileImageUrl: resolveImageUrl(formData.profileImage, "/Images/profileImages"),
      errors,
      success: false
    });
  }

  try {
    const updateData = {
      name: formData.name,
      lastName: formData.lastName,
      phone: formData.phone
    };
    const previousProfileImagePath = req.file?.filename
      ? resolveProfileImagePath(user.profileImage)
      : null;

    // reemplazo de imagen
    if (req.file?.filename) {
      updateData.profileImage = req.file.filename;
    }

    const updatedUser = await Users.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      await removeUploadedFile(req.file?.path);

      return res.render("client/profile", {
        ...getClientViewModel(req, "Mi perfil"),
        formData,
        profileImageUrl: resolveImageUrl(formData.profileImage, "/Images/profileImages"),
        errors: ["No se encontro el usuario."],
        success: false
      });
    }

    req.session.user = updatedUser;
    await removeUploadedFile(previousProfileImagePath);

    return res.render("client/profile", {
      ...getClientViewModel(req, "Mi perfil"),
      formData: {
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profileImage: updatedUser.profileImage
      },
      profileImageUrl: resolveImageUrl(updatedUser.profileImage, "/Images/profileImages"),
      errors: [],
      success: true
    });

  } catch (ex) {
    await removeUploadedFile(req.file?.path);

    console.error("Error updating profile:", ex);

    return res.render("client/profile", {
      ...getClientViewModel(req, "Mi perfil"),
      formData,
      profileImageUrl: resolveImageUrl(formData.profileImage, "/Images/profileImages"),
      errors: ["No se pudo actualizar el perfil."],
      success: false
    });
  }
}

export async function getOrders(req, res) {
  const sessionUserId = req.session?.user?._id || req.session?.user?.id;

  if (!sessionUserId) {
    return res.redirect("/user/login");
  }

  try {

    const orders = await getOrdersByClient(sessionUserId);
    const mappedOrders = orders.map((order) => {
      const commerceData = order?.commerceId;
      const commerceName =
        commerceData && typeof commerceData === "object"
          ? commerceData.name || commerceData.email || "Comercio"
          : "Comercio";

      const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
      const createdAtLabel =
        createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.toLocaleString("es-DO", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            })
          : "-";

      const totalValue = Number(order?.total || 0);
      const totalLabel = totalValue.toLocaleString("es-DO", {
        style: "currency",
        currency: "DOP"
      });

      const productsCount = Array.isArray(order?.products) ? order.products.length : 0;
      const shortId = String(order?._id || "").slice(-6).toUpperCase();

      return {
        id: order?._id,
        shortId,
        commerceName,
        productsCount,
        status: order?.status || "pendiente",
        totalLabel,
        createdAtLabel
      };
    });


    return res.render("client/orders", {
      ...getClientViewModel(req, "Mis pedidos"),
      ordersList: mappedOrders,
      hasOrders: mappedOrders.length > 0,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    return res.status(500).render("client/orders", {
      ...getClientViewModel(req, "Mis pedidos"),
      ordersList: [],
      hasOrders: false,
      loadError: true
    });
  }
}

export async function getAddresses(req, res) {
  try {
    const addresses = await getAddressesByUser(req.session.user._id);

    return res.render("client/addresses", {
      ...getClientViewModel(req, "Mis direcciones"),
      addressesList: addresses,
      hasAddresses: addresses.length > 0,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  } catch (err) {
    console.error("Error fetching addresses:", err);
    req.flash("errors", "Error al obtener las direcciones");
    return res.status(500).render("client/addresses", {
      ...getClientViewModel(req, "Mis direcciones"),
      addressesList: [],
      hasAddresses: false,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  }
}

export async function getFavorites(req, res) {
  try {
    const favorites = await getFavoritesByClient(req.session.user._id);
    const favoritesList = favorites.map((favorite) => ({
      ...favorite,
      commerceId: favorite.commerceId
        ? {
            ...favorite.commerceId,
            logoUrl: resolveImageUrl(favorite.commerceId.profileImage, "/Images/profileImages")
          }
        : favorite.commerceId
    }));

    return res.render("client/favorites", {
      ...getClientViewModel(req, "Mis favoritos"),
      favoritesList,
      hasFavorites: favoritesList.length > 0,
      errors: req.flash("errors"),
      success: req.flash("success")
    });
  }
  catch (err) {
    console.error("Error fetching favorites:", err);
    req.flash("errors", "Error al obtener los favoritos");
  }
}
