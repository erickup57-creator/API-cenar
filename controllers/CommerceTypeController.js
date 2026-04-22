import { unlink } from "node:fs/promises";
import path from "node:path";
import CommerceType from "../models/CommerceTypeModel.js";
import Commerce from "../models/CommerceModel.js";
import { projectRoot } from "../utils/Paths.js";

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

function isCssIconClass(iconValue) {
  if (!iconValue || typeof iconValue !== "string") return false;

  const normalized = iconValue.trim();
  if (!normalized) return false;

  const hasPathLikeChars = /[\\/]/.test(normalized);
  const hasFileExtension = /\.[a-z0-9]+$/i.test(normalized);

  return !hasPathLikeChars && !hasFileExtension && /(fa-|bi-|\bbi\b)/i.test(normalized);
}

function mapIconForView(iconValue) {
  const normalized = sanitizeText(iconValue).replace(/\\/g, "/");

  if (!normalized) {
    return {
      iconUrl: null,
      iconClass: null
    };
  }

  if (isCssIconClass(normalized)) {
    return {
      iconUrl: null,
      iconClass: normalized
    };
  }

  return {
    iconUrl: resolveImageUrl(normalized, "/Images/commerceTypeIcons"),
    iconClass: null
  };
}

function getManagedIconFileName(iconValue) {
  const normalized = sanitizeText(iconValue).replace(/\\/g, "/");
  if (!normalized || isCssIconClass(normalized)) return null;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return null;

  if (normalized.startsWith("/Images/commerceTypeIcons/")) {
    return normalized.split("/").pop() || null;
  }

  if (normalized.startsWith("Images/commerceTypeIcons/")) {
    return normalized.split("/").pop() || null;
  }

  if (normalized.startsWith("public/Images/commerceTypeIcons/")) {
    return normalized.split("/").pop() || null;
  }

  if (normalized.includes("/")) return null;

  return normalized;
}

async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.error("Error deleting uploaded file:", err);
    }
  }
}

async function removeStoredCommerceTypeIcon(iconValue) {
  const fileName = getManagedIconFileName(iconValue);
  if (!fileName) return;

  const iconPath = path.join(projectRoot, "public", "Images", "commerceTypeIcons", fileName);
  await removeUploadedFile(iconPath);
}

function renderSaveView(res, options) {
  const {
    editMode,
    formData = {},
    commerceType = null,
    errors = [],
    statusCode = 200,
    pageTitle
  } = options;

  const viewCommerceType = commerceType
    ? {
        ...commerceType,
        ...mapIconForView(commerceType.icon)
      }
    : null;

  return res.status(statusCode).render("commerceType/save", {
    editMode,
    formData,
    commerceType: viewCommerceType,
    errors,
    layout: "admin-layout",
    "page-title": pageTitle
  });
}

//#region GET

export async function getCommerceType(req, res, next) {
  try {
    const [result, groupedCounts] = await Promise.all([
      CommerceType.find({}).lean(),
      Commerce.aggregate([
        {
          $group: {
            _id: "$commerceType",
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    const countsByTypeId = new Map(groupedCounts.map((item) => [String(item._id), item.total]));

    const commerceTypes = (result || []).map((type) => ({
      ...type,
      ...mapIconForView(type.icon),
      commercesCount: countsByTypeId.get(String(type._id)) || 0
    }));

    return res.render("commerceType/index", {
      commerceTypesList: commerceTypes,
      hasCommerceTypes: commerceTypes.length > 0,
      layout: "admin-layout",
      "page-title": "Commerce Types Home"
    });
  } catch (err) {
    console.error("Error fetching commerce types:", err);

    req.flash("error", "An error occurred while fetching commerce types.");
    return res.redirect("/");
  }
}

//#endregion

//#region SAVE

export async function getCommerceTypeSave(req, res, next) {
  return renderSaveView(res, {
    editMode: false,
    formData: { name: "", description: "" },
    errors: [],
    pageTitle: "Add Commerce Type"
  });
}

export async function postCommerceTypeSave(req, res, next) {
  const formData = {
    name: sanitizeText(req.body?.name),
    description: sanitizeText(req.body?.description)
  };

  const errors = [];

  if (!formData.name) errors.push("El nombre es obligatorio.");
  if (!formData.description) errors.push("La descripcion es obligatoria.");
  if (!req.file?.filename) errors.push("El icono es obligatorio.");

  if (errors.length > 0) {
    await removeUploadedFile(req.file?.path);
    return renderSaveView(res, {
      editMode: false,
      formData,
      errors,
      statusCode: 400,
      pageTitle: "Add Commerce Type"
    });
  }

  try {
    await CommerceType.create({
      name: formData.name,
      description: formData.description,
      icon: req.file.filename
    });

    req.flash("success", "Commerce type saved successfully.");
    return res.redirect("/commerceType");
  } catch (err) {
    console.error("Error saving commerce type:", err);
    await removeUploadedFile(req.file?.path);

    return renderSaveView(res, {
      editMode: false,
      formData,
      errors: ["No se pudo guardar el tipo de comercio."],
      statusCode: 500,
      pageTitle: "Add Commerce Type"
    });
  }
}

//#endregion

//#region UPDATE

export async function getCommerceTypeEdit(req, res, next) {
  const id = req.params.id;

  try {
    const commerceType = await CommerceType.findById(id).lean();

    if (!commerceType) {
      req.flash("error", "Commerce type not found.");
      return res.redirect("/commerceType");
    }

    return renderSaveView(res, {
      editMode: true,
      commerceType,
      formData: {
        name: commerceType.name || "",
        description: commerceType.description || ""
      },
      errors: [],
      pageTitle: `Edit Commerce Type ${commerceType.name}`
    });
  } catch (err) {
    console.error("Error fetching commerce type for edit:", err);

    req.flash("error", "An error occurred while fetching the commerce type for edit.");
    return res.redirect("/commerceType");
  }
}

export async function postCommerceTypeEdit(req, res, next) {
  const id = sanitizeText(req.body?.id);
  const formData = {
    name: sanitizeText(req.body?.name),
    description: sanitizeText(req.body?.description)
  };

  try {
    const commerceType = await CommerceType.findById(id).lean();

    if (!commerceType) {
      await removeUploadedFile(req.file?.path);
      req.flash("error", "Commerce type not found.");
      return res.redirect("/commerceType");
    }

    const errors = [];
    if (!formData.name) errors.push("El nombre es obligatorio.");
    if (!formData.description) errors.push("La descripcion es obligatoria.");

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);
      return renderSaveView(res, {
        editMode: true,
        commerceType: {
          ...commerceType,
          name: formData.name,
          description: formData.description
        },
        formData,
        errors,
        statusCode: 400,
        pageTitle: `Edit Commerce Type ${commerceType.name}`
      });
    }

    const updateData = {
      name: formData.name,
      description: formData.description
    };

    if (req.file?.filename) {
      updateData.icon = req.file.filename;
    }

    await CommerceType.findByIdAndUpdate(id, updateData);

    if (req.file?.filename && commerceType.icon && commerceType.icon !== req.file.filename) {
      await removeStoredCommerceTypeIcon(commerceType.icon);
    }

    req.flash("success", "Commerce type updated successfully.");
    return res.redirect("/commerceType");
  } catch (err) {
    console.error("Error updating commerce type:", err);
    await removeUploadedFile(req.file?.path);

    return renderSaveView(res, {
      editMode: true,
      commerceType: {
        _id: id,
        name: formData.name,
        description: formData.description,
        icon: null
      },
      formData,
      errors: ["No se pudo actualizar el tipo de comercio."],
      statusCode: 500,
      pageTitle: "Edit Commerce Type"
    });
  }
}

//#endregion

//#region DELETE

export async function getCommerceTypeDelete(req, res, next) {
  const id = req.params.id;

  try {
    const [commerceType, commercesCount] = await Promise.all([
      CommerceType.findById(id).lean(),
      Commerce.countDocuments({ commerceType: id })
    ]);

    if (!commerceType) {
      req.flash("error", "Commerce type not found.");
      return res.redirect("/commerceType");
    }

    return res.render("commerceType/delete", {
      commerceType,
      commercesCount,
      layout: "admin-layout",
      "page-title": `Delete Commerce Type ${commerceType.name}`
    });
  } catch (err) {
    console.error("Error loading commerce type delete confirmation:", err);
    req.flash("error", "An error occurred while loading delete confirmation.");
    return res.redirect("/commerceType");
  }
}

export async function postCommerceTypeDelete(req, res, next) {
  const id = req.params.id;

  try {
    const commerceType = await CommerceType.findById(id).lean();

    if (!commerceType) {
      req.flash("error", "Commerce type not found.");
      return res.redirect("/commerceType");
    }

    await Commerce.deleteMany({ commerceType: id });
    await CommerceType.findByIdAndDelete(id);
    await removeStoredCommerceTypeIcon(commerceType.icon);

    req.flash("success", "Commerce type deleted successfully.");
    return res.redirect("/commerceType");
  } catch (err) {
    console.error("Error deleting commerce type:", err);

    req.flash("error", "An error occurred while deleting the commerce type.");
    return res.redirect("/commerceType");
  }
}

//#endregion
