import {
  assignDeliveryToCommerceOrder,
  getCommerceOrderById,
  getOrdersByCommerce
} from "./orders.controller.js";


import { unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import Commerce from "../models/CommerceModel.js";
import Category from "../models/CategoryModel.js";
import CommerceType from "../models/CommerceTypeModel.js";
import Product from "../models/ProductModel.js";
import { projectRoot } from "../utils/Paths.js";

function getCommerceViewModel(req, title) {
  return {
    layout: "commerce-layout",
    title,
    user: req.session?.user ?? null
  };
}

function formatDOP(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP"
  });
}

function formatDateTime(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resolveImageUrl(fileName, fallbackPrefix) {
  if (!fileName || typeof fileName !== "string") return null;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.startsWith("/")) {
    return fileName;
  }

  return `${fallbackPrefix}/${fileName}`;
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}

function getSessionCommerceId(req) {
  return req.session?.user?._id || req.session?.user?.id || null;
}

function buildProfileFormData(commerce, override = {}) {
  return {
    phone: override.phone ?? commerce?.phone ?? "",
    email: override.email ?? commerce?.email ?? "",
    openingTime: override.openingTime ?? commerce?.openingTime ?? "",
    closingTime: override.closingTime ?? commerce?.closingTime ?? ""
  };
}

function buildCategoryFormData(category, override = {}) {
  return {
    name: override.name ?? category?.name ?? "",
    description: override.description ?? category?.description ?? ""
  };
}

function buildProductFormData(product, override = {}) {
  return {
    name: override.name ?? product?.name ?? "",
    description: override.description ?? product?.description ?? "",
    price: override.price ?? product?.price ?? "",
    categoryId:
      override.categoryId ??
      String(product?.categoryId?._id || product?.categoryId || ""),
    image: override.image ?? product?.image ?? ""
  };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toObjectId(value) {
  return isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function parsePrice(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getCommerceCategoriesOptions(commerceId) {
  const categories = await Category.find({ commerceId })
    .sort({ name: 1 })
    .select("name")
    .lean();

  return categories.map((category) => ({
    id: String(category._id),
    name: category.name || ""
  }));
}

async function countProductsByCategory({ commerceId, categoryId }) {
  if (!mongoose.connection?.db) {
    return 0;
  }

  const productsCollection = mongoose.connection.db.collection("Products");
  const commerceObjectId = toObjectId(commerceId);
  const categoryObjectId = toObjectId(categoryId);

  if (!commerceObjectId || !categoryObjectId) {
    return 0;
  }

  const commerceIdAsString = String(commerceObjectId);
  const categoryIdAsString = String(categoryObjectId);

  const filter = {
    $and: [
      {
        $or: [
          { commerceId: commerceObjectId },
          { commerceId: commerceIdAsString },
          { commerce: commerceObjectId },
          { commerce: commerceIdAsString }
        ]
      },
      {
        $or: [
          { categoryId: categoryObjectId },
          { categoryId: categoryIdAsString },
          { category: categoryObjectId },
          { category: categoryIdAsString },
          { categoryIds: categoryObjectId },
          { categoryIds: categoryIdAsString },
          { categories: categoryObjectId },
          { categories: categoryIdAsString }
        ]
      }
    ]
  };

  return productsCollection.countDocuments(filter);
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

async function removePreviousProfileImage(fileName) {
  if (!fileName || typeof fileName !== "string") return;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.includes("/") || fileName.includes("\\")) {
    return;
  }

  const imagePath = path.join(projectRoot, "public", "Images", "profileImages", fileName);
  await removeUploadedFile(imagePath);
}

async function removePreviousProductImage(fileName) {
  if (!fileName || typeof fileName !== "string") return;
  if (fileName.startsWith("http://") || fileName.startsWith("https://") || fileName.includes("/") || fileName.includes("\\")) {
    return;
  }

  const imagePath = path.join(projectRoot, "public", "Images", "products", fileName);
  await removeUploadedFile(imagePath);
}

export async function getDashboard(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const orders = await getOrdersByCommerce(sessionCommerceId);
    const mappedOrders = orders.map((order) => {
      const commerceData = order?.commerceId;
      const commerceName =
        commerceData && typeof commerceData === "object"
          ? commerceData.name || commerceData.email || "Comercio"
          : "Comercio";

      const logoFileName =
        commerceData && typeof commerceData === "object" ? commerceData.profileImage : null;
      const commerceLogoUrl = resolveImageUrl(logoFileName, "/Images/profileImages");

      const productsCount = Array.isArray(order?.products) ? order.products.length : 0;

      return {
        id: String(order?._id || ""),
        status: order?.status || "pendiente",
        commerceName,
        commerceLogoUrl,
        totalLabel: formatDOP(order?.total),
        productsCount,
        createdAtLabel: formatDateTime(order?.createdAt)
      };
    });

    return res.render("commerce/dashboard/index", {
      ...getCommerceViewModel(req, "Home del comercio"),
      ordersList: mappedOrders,
      hasOrders: mappedOrders.length > 0
    });
  } catch (err) {
    console.error("Error fetching commerce orders:", err);
    return res.status(500).render("commerce/dashboard/index", {
      ...getCommerceViewModel(req, "Home del comercio"),
      ordersList: [],
      hasOrders: false,
      loadError: true
    });
  }
}

export async function getProfile(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const commerce = await Commerce.findById(sessionCommerceId)
      .select("profileImage openingTime closingTime phone email")
      .lean();

    if (!commerce) {
      req.flash("errors", "No se encontro el comercio logueado.");
      return res.redirect("/user/login");
    }

    const successMessages = req.flash("success");
    const errorMessages = req.flash("errors");

    return res.render("commerce/profile", {
      ...getCommerceViewModel(req, "Perfil del comercio"),
      formData: buildProfileFormData(commerce),
      profileImageUrl: resolveImageUrl(commerce.profileImage, "/Images/profileImages"),
      successMessages,
      errors: errorMessages
    });
  } catch (err) {
    console.error("Error loading commerce profile:", err);
    return res.status(500).render("commerce/profile", {
      ...getCommerceViewModel(req, "Perfil del comercio"),
      formData: buildProfileFormData(null),
      profileImageUrl: null,
      successMessages: [],
      errors: ["No se pudo cargar la informacion del perfil."]
    });
  }
}

export async function postProfile(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    await removeUploadedFile(req.file?.path);
    return res.redirect("/user/login");
  }

  try {
    const commerce = await Commerce.findById(sessionCommerceId);

    if (!commerce) {
      await removeUploadedFile(req.file?.path);
      req.flash("errors", "No se encontro el comercio logueado.");
      return res.redirect("/user/login");
    }

    const formData = {
      phone: sanitizeText(req.body?.phone),
      email: sanitizeText(req.body?.email).toLowerCase(),
      openingTime: sanitizeText(req.body?.openingTime),
      closingTime: sanitizeText(req.body?.closingTime)
    };

    const errors = [];

    if (!formData.phone) errors.push("El telefono es obligatorio.");
    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
    }
    if (!formData.email) errors.push("El correo es obligatorio.");
    if (!formData.openingTime) errors.push("La hora de apertura es obligatoria.");
    if (!formData.closingTime) errors.push("La hora de cierre es obligatoria.");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("El correo no tiene un formato valido.");
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).render("commerce/profile", {
        ...getCommerceViewModel(req, "Perfil del comercio"),
        formData: buildProfileFormData(commerce, formData),
        profileImageUrl: resolveImageUrl(commerce.profileImage, "/Images/profileImages"),
        successMessages: [],
        errors
      });
    }

    const previousProfileImage = commerce.profileImage;

    commerce.phone = formData.phone;
    commerce.email = formData.email;
    commerce.openingTime = formData.openingTime;
    commerce.closingTime = formData.closingTime;

    if (req.file?.filename) {
      commerce.profileImage = req.file.filename;
    }

    await commerce.save();

    if (req.file?.filename && previousProfileImage && previousProfileImage !== req.file.filename) {
      await removePreviousProfileImage(previousProfileImage);
    }

    if (req.session?.user) {
      req.session.user = {
        ...req.session.user,
        phone: commerce.phone,
        email: commerce.email,
        openingTime: commerce.openingTime,
        closingTime: commerce.closingTime,
        profileImage: commerce.profileImage
      };
    }

    req.flash("success", "Perfil del comercio actualizado correctamente.");
    return req.session.save((saveError) => {
      if (saveError) {
        console.error("Error saving session after commerce profile update:", saveError);
      }

      return res.redirect("/commerce/profile");
    });
  } catch (err) {
    console.error("Error updating commerce profile:", err);
    await removeUploadedFile(req.file?.path);

    return res.status(500).render("commerce/profile", {
      ...getCommerceViewModel(req, "Perfil del comercio"),
      formData: {
        phone: sanitizeText(req.body?.phone),
        email: sanitizeText(req.body?.email).toLowerCase(),
        openingTime: sanitizeText(req.body?.openingTime),
        closingTime: sanitizeText(req.body?.closingTime)
      },
      profileImageUrl: null,
      successMessages: [],
      errors: ["No se pudo actualizar el perfil. Intenta nuevamente."]
    });
  }
}

export async function getCategories(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const categories = await Category.find({ commerceId: sessionCommerceId })
      .sort({ createdAt: -1 })
      .lean();

    const categoriesList = await Promise.all(
      categories.map(async (category) => ({
        id: String(category._id),
        name: category.name || "",
        description: category.description || "",
        productsCount: await countProductsByCategory({
          commerceId: sessionCommerceId,
          categoryId: category._id
        })
      }))
    );

    return res.render("commerce/categories", {
      ...getCommerceViewModel(req, "Mantenimiento de categorias"),
      categoriesList,
      hasCategories: categoriesList.length > 0,
      successMessages: req.flash("success"),
      errors: req.flash("errors")
    });
  } catch (err) {
    console.error("Error loading commerce categories:", err);
    return res.status(500).render("commerce/categories", {
      ...getCommerceViewModel(req, "Mantenimiento de categorias"),
      categoriesList: [],
      hasCategories: false,
      successMessages: [],
      errors: ["No se pudo cargar el listado de categorias."]
    });
  }
}

export function getCreateCategory(req, res) {
  return res.render("commerce/category-save", {
    ...getCommerceViewModel(req, "Crear categoria"),
    formData: buildCategoryFormData(null),
    formAction: "/commerce/categories/new",
    backHref: "/commerce/categories",
    submitLabel: "Crear categoria",
    errors: []
  });
}

export async function postCreateCategory(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  const formData = {
    name: sanitizeText(req.body?.name),
    description: sanitizeText(req.body?.description)
  };
  const errors = [];

  if (!formData.name) errors.push("El nombre de la categoria es obligatorio.");
  if (!formData.description) errors.push("La descripcion es obligatoria.");

  if (errors.length > 0) {
    return res.status(400).render("commerce/category-save", {
      ...getCommerceViewModel(req, "Crear categoria"),
      formData,
      formAction: "/commerce/categories/new",
      backHref: "/commerce/categories",
      submitLabel: "Crear categoria",
      errors
    });
  }

  try {
    await Category.create({
      commerceId: sessionCommerceId,
      name: formData.name,
      description: formData.description
    });

    req.flash("success", "Categoria creada correctamente.");
    return res.redirect("/commerce/categories");
  } catch (err) {
    console.error("Error creating commerce category:", err);

    if (err?.code === 11000) {
      errors.push("Ya existe una categoria con ese nombre.");
    } else {
      errors.push("No se pudo crear la categoria. Intenta nuevamente.");
    }

    return res.status(500).render("commerce/category-save", {
      ...getCommerceViewModel(req, "Crear categoria"),
      formData,
      formAction: "/commerce/categories/new",
      backHref: "/commerce/categories",
      submitLabel: "Crear categoria",
      errors
    });
  }
}

export async function getEditCategory(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const categoryId = req.params?.categoryId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(categoryId)) {
    req.flash("errors", "Categoria invalida.");
    return res.redirect("/commerce/categories");
  }

  try {
    const category = await Category.findOne({
      _id: categoryId,
      commerceId: sessionCommerceId
    }).lean();

    if (!category) {
      req.flash("errors", "Categoria no encontrada.");
      return res.redirect("/commerce/categories");
    }

    return res.render("commerce/category-save", {
      ...getCommerceViewModel(req, "Editar categoria"),
      formData: buildCategoryFormData(category),
      formAction: `/commerce/categories/${categoryId}/edit`,
      backHref: "/commerce/categories",
      submitLabel: "Guardar categoria",
      errors: []
    });
  } catch (err) {
    console.error("Error loading commerce category for edit:", err);
    req.flash("errors", "No se pudo cargar la categoria.");
    return res.redirect("/commerce/categories");
  }
}

export async function postEditCategory(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const categoryId = req.params?.categoryId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(categoryId)) {
    req.flash("errors", "Categoria invalida.");
    return res.redirect("/commerce/categories");
  }

  const formData = {
    name: sanitizeText(req.body?.name),
    description: sanitizeText(req.body?.description)
  };
  const errors = [];

  if (!formData.name) errors.push("El nombre de la categoria es obligatorio.");
  if (!formData.description) errors.push("La descripcion es obligatoria.");

  if (errors.length > 0) {
    return res.status(400).render("commerce/category-save", {
      ...getCommerceViewModel(req, "Editar categoria"),
      formData,
      formAction: `/commerce/categories/${categoryId}/edit`,
      backHref: "/commerce/categories",
      submitLabel: "Guardar categoria",
      errors
    });
  }

  try {
    const updated = await Category.findOneAndUpdate(
      {
        _id: categoryId,
        commerceId: sessionCommerceId
      },
      {
        name: formData.name,
        description: formData.description
      },
      { new: true }
    ).lean();

    if (!updated) {
      req.flash("errors", "Categoria no encontrada.");
      return res.redirect("/commerce/categories");
    }

    req.flash("success", "Categoria actualizada correctamente.");
    return res.redirect("/commerce/categories");
  } catch (err) {
    console.error("Error updating commerce category:", err);

    if (err?.code === 11000) {
      errors.push("Ya existe una categoria con ese nombre.");
    } else {
      errors.push("No se pudo actualizar la categoria. Intenta nuevamente.");
    }

    return res.status(500).render("commerce/category-save", {
      ...getCommerceViewModel(req, "Editar categoria"),
      formData,
      formAction: `/commerce/categories/${categoryId}/edit`,
      backHref: "/commerce/categories",
      submitLabel: "Guardar categoria",
      errors
    });
  }
}

export async function getDeleteCategory(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const categoryId = req.params?.categoryId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(categoryId)) {
    req.flash("errors", "Categoria invalida.");
    return res.redirect("/commerce/categories");
  }

  try {
    const category = await Category.findOne({
      _id: categoryId,
      commerceId: sessionCommerceId
    })
      .select("name description")
      .lean();

    if (!category) {
      req.flash("errors", "Categoria no encontrada.");
      return res.redirect("/commerce/categories");
    }

    return res.render("commerce/category-delete", {
      ...getCommerceViewModel(req, "Eliminar categoria"),
      categoryId: String(category._id),
      categoryName: category.name || "",
      categoryDescription: category.description || "",
      backHref: "/commerce/categories",
      formAction: `/commerce/categories/${categoryId}/delete`
    });
  } catch (err) {
    console.error("Error loading commerce category for delete confirmation:", err);
    req.flash("errors", "No se pudo cargar la categoria.");
    return res.redirect("/commerce/categories");
  }
}

export async function postDeleteCategory(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const categoryId = req.params?.categoryId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(categoryId)) {
    req.flash("errors", "Categoria invalida.");
    return res.redirect("/commerce/categories");
  }

  try {
    const deleted = await Category.findOneAndDelete({
      _id: categoryId,
      commerceId: sessionCommerceId
    }).lean();

    if (!deleted) {
      req.flash("errors", "Categoria no encontrada.");
      return res.redirect("/commerce/categories");
    }

    req.flash("success", "Categoria eliminada correctamente.");
    return res.redirect("/commerce/categories");
  } catch (err) {
    console.error("Error deleting commerce category:", err);
    req.flash("errors", "No se pudo eliminar la categoria.");
    return res.redirect("/commerce/categories");
  }
}

export async function getProducts(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const products = await Product.find({ commerceId: sessionCommerceId })
      .populate({ path: "categoryId", model: "Category", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    const productsList = products.map((product) => ({
      id: String(product._id),
      name: product.name || "",
      description: product.description || "",
      categoryName: product?.categoryId?.name || "Sin categoria",
      priceLabel: formatDOP(product.price),
      imageUrl: resolveImageUrl(product.image, "/Images/products")
    }));

    return res.render("commerce/products", {
      ...getCommerceViewModel(req, "Mantenimiento de productos"),
      productsList,
      hasProducts: productsList.length > 0,
      successMessages: req.flash("success"),
      errors: req.flash("errors")
    });
  } catch (err) {
    console.error("Error loading commerce products:", err);
    return res.status(500).render("commerce/products", {
      ...getCommerceViewModel(req, "Mantenimiento de productos"),
      productsList: [],
      hasProducts: false,
      successMessages: [],
      errors: ["No se pudo cargar el listado de productos."]
    });
  }
}

export async function getCreateProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const categoriesOptions = await getCommerceCategoriesOptions(sessionCommerceId);

    return res.render("commerce/product-save", {
      ...getCommerceViewModel(req, "Crear producto"),
      formData: buildProductFormData(null),
      formAction: "/commerce/products/new",
      backHref: "/commerce/products",
      submitLabel: "Crear producto",
      categoriesOptions,
      hasCategories: categoriesOptions.length > 0,
      requireImage: true,
      currentImageUrl: null,
      errors: []
    });
  } catch (err) {
    console.error("Error loading commerce categories for product creation:", err);
    req.flash("errors", "No se pudo cargar el formulario de productos.");
    return res.redirect("/commerce/products");
  }
}

export async function postCreateProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);

  if (!sessionCommerceId) {
    await removeUploadedFile(req.file?.path);
    return res.redirect("/user/login");
  }

  const formData = {
    name: sanitizeText(req.body?.name),
    description: sanitizeText(req.body?.description),
    price: sanitizeText(req.body?.price),
    categoryId: sanitizeText(req.body?.categoryId),
    image: req.file?.filename || ""
  };

  const errors = [];
  const parsedPrice = parsePrice(formData.price);

  if (!formData.name) errors.push("El nombre del producto es obligatorio.");
  if (!formData.description) errors.push("La descripcion del producto es obligatoria.");
  if (!formData.price) errors.push("El precio del producto es obligatorio.");
  if (!formData.categoryId) errors.push("La categoria del producto es obligatoria.");
  if (!req.file?.filename) errors.push("La foto del producto es obligatoria.");
  if (parsedPrice === null && formData.price) errors.push("El precio del producto no es valido.");
  if (parsedPrice !== null && parsedPrice <= 0) errors.push("El precio del producto debe ser mayor que cero.");
  if (formData.categoryId && !isValidObjectId(formData.categoryId)) {
    errors.push("La categoria seleccionada no es valida.");
  }

  let selectedCategory = null;
  if (errors.length === 0) {
    try {
      selectedCategory = await Category.findOne({
        _id: formData.categoryId,
        commerceId: sessionCommerceId
      })
        .select("_id")
        .lean();

      if (!selectedCategory) {
        errors.push("La categoria seleccionada no pertenece a este comercio.");
      }
    } catch (err) {
      console.error("Error validating category on create product:", err);
      errors.push("No se pudo validar la categoria seleccionada.");
    }
  }

  if (errors.length > 0) {
    await removeUploadedFile(req.file?.path);

    try {
      const categoriesOptions = await getCommerceCategoriesOptions(sessionCommerceId);
      return res.status(400).render("commerce/product-save", {
        ...getCommerceViewModel(req, "Crear producto"),
        formData,
        formAction: "/commerce/products/new",
        backHref: "/commerce/products",
        submitLabel: "Crear producto",
        categoriesOptions,
        hasCategories: categoriesOptions.length > 0,
        requireImage: true,
        currentImageUrl: null,
        errors
      });
    } catch (err) {
      console.error("Error reloading categories on create product validation:", err);
      req.flash("errors", "No se pudo validar la informacion del producto.");
      return res.redirect("/commerce/products");
    }
  }

  try {
    await Product.create({
      commerceId: sessionCommerceId,
      categoryId: selectedCategory._id,
      name: formData.name,
      description: formData.description,
      price: parsedPrice,
      image: req.file.filename
    });

    req.flash("success", "Producto creado correctamente.");
    return res.redirect("/commerce/products");
  } catch (err) {
    console.error("Error creating commerce product:", err);

    await removeUploadedFile(req.file?.path);

    try {
      const categoriesOptions = await getCommerceCategoriesOptions(sessionCommerceId);
      return res.status(500).render("commerce/product-save", {
        ...getCommerceViewModel(req, "Crear producto"),
        formData,
        formAction: "/commerce/products/new",
        backHref: "/commerce/products",
        submitLabel: "Crear producto",
        categoriesOptions,
        hasCategories: categoriesOptions.length > 0,
        requireImage: true,
        currentImageUrl: null,
        errors: ["No se pudo crear el producto. Intenta nuevamente."]
      });
    } catch (categoriesErr) {
      console.error("Error loading categories after create product failure:", categoriesErr);
      req.flash("errors", "No se pudo crear el producto. Intenta nuevamente.");
      return res.redirect("/commerce/products");
    }
  }
}

export async function getEditProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const productId = req.params?.productId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(productId)) {
    req.flash("errors", "Producto invalido.");
    return res.redirect("/commerce/products");
  }

  try {
    const [product, categoriesOptions] = await Promise.all([
      Product.findOne({
        _id: productId,
        commerceId: sessionCommerceId
      }).lean(),
      getCommerceCategoriesOptions(sessionCommerceId)
    ]);

    if (!product) {
      req.flash("errors", "Producto no encontrado.");
      return res.redirect("/commerce/products");
    }

    return res.render("commerce/product-save", {
      ...getCommerceViewModel(req, "Editar producto"),
      formData: buildProductFormData(product),
      formAction: `/commerce/products/${productId}/edit`,
      backHref: "/commerce/products",
      submitLabel: "Guardar producto",
      categoriesOptions,
      hasCategories: categoriesOptions.length > 0,
      requireImage: false,
      currentImageUrl: resolveImageUrl(product.image, "/Images/products"),
      errors: []
    });
  } catch (err) {
    console.error("Error loading commerce product for edit:", err);
    req.flash("errors", "No se pudo cargar el producto.");
    return res.redirect("/commerce/products");
  }
}

export async function postEditProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const productId = req.params?.productId;

  if (!sessionCommerceId) {
    await removeUploadedFile(req.file?.path);
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(productId)) {
    await removeUploadedFile(req.file?.path);
    req.flash("errors", "Producto invalido.");
    return res.redirect("/commerce/products");
  }

  try {
    const existingProduct = await Product.findOne({
      _id: productId,
      commerceId: sessionCommerceId
    }).lean();

    if (!existingProduct) {
      await removeUploadedFile(req.file?.path);
      req.flash("errors", "Producto no encontrado.");
      return res.redirect("/commerce/products");
    }

    const formData = {
      name: sanitizeText(req.body?.name),
      description: sanitizeText(req.body?.description),
      price: sanitizeText(req.body?.price),
      categoryId: sanitizeText(req.body?.categoryId),
      image: existingProduct.image || ""
    };

    const errors = [];
    const parsedPrice = parsePrice(formData.price);

    if (!formData.name) errors.push("El nombre del producto es obligatorio.");
    if (!formData.description) errors.push("La descripcion del producto es obligatoria.");
    if (!formData.price) errors.push("El precio del producto es obligatorio.");
    if (!formData.categoryId) errors.push("La categoria del producto es obligatoria.");
    if (parsedPrice === null && formData.price) errors.push("El precio del producto no es valido.");
    if (parsedPrice !== null && parsedPrice <= 0) errors.push("El precio del producto debe ser mayor que cero.");
    if (formData.categoryId && !isValidObjectId(formData.categoryId)) {
      errors.push("La categoria seleccionada no es valida.");
    }

    let selectedCategory = null;
    if (errors.length === 0) {
      selectedCategory = await Category.findOne({
        _id: formData.categoryId,
        commerceId: sessionCommerceId
      })
        .select("_id")
        .lean();

      if (!selectedCategory) {
        errors.push("La categoria seleccionada no pertenece a este comercio.");
      }
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);

      const categoriesOptions = await getCommerceCategoriesOptions(sessionCommerceId);
      return res.status(400).render("commerce/product-save", {
        ...getCommerceViewModel(req, "Editar producto"),
        formData,
        formAction: `/commerce/products/${productId}/edit`,
        backHref: "/commerce/products",
        submitLabel: "Guardar producto",
        categoriesOptions,
        hasCategories: categoriesOptions.length > 0,
        requireImage: false,
        currentImageUrl: resolveImageUrl(existingProduct.image, "/Images/products"),
        errors
      });
    }

    const nextImage = req.file?.filename || existingProduct.image;

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        commerceId: sessionCommerceId
      },
      {
        name: formData.name,
        description: formData.description,
        price: parsedPrice,
        categoryId: selectedCategory._id,
        image: nextImage
      },
      { new: true }
    ).lean();

    if (!updated) {
      await removeUploadedFile(req.file?.path);
      req.flash("errors", "Producto no encontrado.");
      return res.redirect("/commerce/products");
    }

    if (req.file?.filename && existingProduct.image && existingProduct.image !== req.file.filename) {
      await removePreviousProductImage(existingProduct.image);
    }

    req.flash("success", "Producto actualizado correctamente.");
    return res.redirect("/commerce/products");
  } catch (err) {
    console.error("Error updating commerce product:", err);
    await removeUploadedFile(req.file?.path);

    try {
      const categoriesOptions = await getCommerceCategoriesOptions(sessionCommerceId);
      return res.status(500).render("commerce/product-save", {
        ...getCommerceViewModel(req, "Editar producto"),
        formData: {
          name: sanitizeText(req.body?.name),
          description: sanitizeText(req.body?.description),
          price: sanitizeText(req.body?.price),
          categoryId: sanitizeText(req.body?.categoryId),
          image: ""
        },
        formAction: `/commerce/products/${productId}/edit`,
        backHref: "/commerce/products",
        submitLabel: "Guardar producto",
        categoriesOptions,
        hasCategories: categoriesOptions.length > 0,
        requireImage: false,
        currentImageUrl: null,
        errors: ["No se pudo actualizar el producto. Intenta nuevamente."]
      });
    } catch (categoriesErr) {
      console.error("Error loading categories after update product failure:", categoriesErr);
      req.flash("errors", "No se pudo actualizar el producto. Intenta nuevamente.");
      return res.redirect("/commerce/products");
    }
  }
}

export async function getDeleteProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const productId = req.params?.productId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(productId)) {
    req.flash("errors", "Producto invalido.");
    return res.redirect("/commerce/products");
  }

  try {
    const product = await Product.findOne({
      _id: productId,
      commerceId: sessionCommerceId
    })
      .select("name description")
      .lean();

    if (!product) {
      req.flash("errors", "Producto no encontrado.");
      return res.redirect("/commerce/products");
    }

    return res.render("commerce/product-delete", {
      ...getCommerceViewModel(req, "Eliminar producto"),
      productId: String(product._id),
      productName: product.name || "",
      productDescription: product.description || "",
      backHref: "/commerce/products",
      formAction: `/commerce/products/${productId}/delete`
    });
  } catch (err) {
    console.error("Error loading commerce product for delete confirmation:", err);
    req.flash("errors", "No se pudo cargar el producto.");
    return res.redirect("/commerce/products");
  }
}

export async function postDeleteProduct(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const productId = req.params?.productId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  if (!isValidObjectId(productId)) {
    req.flash("errors", "Producto invalido.");
    return res.redirect("/commerce/products");
  }

  try {
    const deleted = await Product.findOneAndDelete({
      _id: productId,
      commerceId: sessionCommerceId
    }).lean();

    if (!deleted) {
      req.flash("errors", "Producto no encontrado.");
      return res.redirect("/commerce/products");
    }

    await removePreviousProductImage(deleted.image);

    req.flash("success", "Producto eliminado correctamente.");
    return res.redirect("/commerce/products");
  } catch (err) {
    console.error("Error deleting commerce product:", err);
    req.flash("errors", "No se pudo eliminar el producto.");
    return res.redirect("/commerce/products");
  }
}

export async function getOrderDetail(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const orderId = req.params?.orderId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  try {
    const order = await getCommerceOrderById(orderId, sessionCommerceId);

    const successMessages = req.flash("success");
    const errorMessages = req.flash("errors");

    if (!order) {
      return res.status(404).render("commerce/order-detail", {
        ...getCommerceViewModel(req, "Detalle del pedido"),
        notFound: true,
        successMessages,
        errorMessages
      });
    }

    const commerceData = order?.commerceId && typeof order.commerceId === "object" ? order.commerceId : null;
    const deliveryData = order?.deliveryId && typeof order.deliveryId === "object" ? order.deliveryId : null;

    const mappedOrder = {
      id: String(order._id),
      status: order.status || "pendiente",
      commerceName: commerceData?.name || commerceData?.email || "Comercio",
      commerceLogoUrl: resolveImageUrl(commerceData?.profileImage, "/Images/profileImages"),
      createdAtLabel: formatDateTime(order.createdAt),
      totalLabel: formatDOP(order.total),
      productsList: Array.isArray(order.products)
        ? order.products.map((product) => ({
            imageUrl: resolveImageUrl(product?.image, "/Images/products"),
            name: product?.name || "Producto",
            priceLabel: formatDOP(product?.price)
          }))
        : [],
      assignedDeliveryName: deliveryData
        ? `${deliveryData.name || ""} ${deliveryData.lastName || ""}`.trim() ||
          deliveryData.username ||
          deliveryData.email ||
          "Delivery"
        : null,
      hasAssignedDelivery: Boolean(deliveryData)
    };

    return res.render("commerce/order-detail", {
      ...getCommerceViewModel(req, "Detalle del pedido"),
      order: mappedOrder,
      productsList: mappedOrder.productsList,
      hasProducts: mappedOrder.productsList.length > 0,
      canAssignDelivery: mappedOrder.status === "pendiente" && !mappedOrder.hasAssignedDelivery,
      successMessages,
      errorMessages
    });
  } catch (err) {
    console.error("Error fetching commerce order detail:", err);
    return res.status(500).render("commerce/order-detail", {
      ...getCommerceViewModel(req, "Detalle del pedido"),
      loadError: true,
      successMessages: [],
      errorMessages: ["No se pudo cargar el detalle del pedido."]
    });
  }
}

export async function postAssignDelivery(req, res) {
  const sessionCommerceId = getSessionCommerceId(req);
  const orderId = req.params?.orderId;

  if (!sessionCommerceId) {
    return res.redirect("/user/login");
  }

  const redirectPath = `/commerce/orders/${orderId}`;

  try {
    const result = await assignDeliveryToCommerceOrder({
      orderId,
      commerceId: sessionCommerceId
    });

    if (!result.ok) {
      switch (result.code) {
        case "invalid_ids":
          req.flash("errors", "Datos invalidos para asignar delivery.");
          break;
        case "order_not_found":
          req.flash("errors", "Pedido no encontrado para este comercio.");
          break;
        case "invalid_status":
          req.flash("errors", "Solo puedes asignar delivery a pedidos pendientes.");
          break;
        case "delivery_not_available":
          req.flash("errors", "No hay delivery disponible en este momento. Intenta mas tarde.");
          break;
        case "delivery_already_assigned":
          req.flash("errors", "Este pedido ya tiene un delivery asignado.");
          break;
        default:
          req.flash("errors", "No se pudo asignar el delivery.");
      }

      return res.redirect(redirectPath);
    }

    req.flash("success", "Delivery asignado correctamente. El pedido ahora esta en proceso.");
    return res.redirect(redirectPath);
  } catch (err) {
    console.error("Error assigning delivery to commerce order:", err);
    req.flash("errors", "Error interno al asignar el delivery.");
    return res.redirect(redirectPath);
  }
}

export async function getCommercesByType(commerceTypeId, search) {
  const query = { commerceType: commerceTypeId, isActive: true };
  if (search) query.name = { $regex: search, $options: "i" };

  const [commerces, commerceType, total] = await Promise.all([
    Commerce.find(query).lean(),
    CommerceType.findById(commerceTypeId).lean(),
    Commerce.countDocuments({ commerceType: commerceTypeId, isActive: true })
  ]);

  return { commerces, commerceType, total };
}
