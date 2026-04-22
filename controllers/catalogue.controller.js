import Commerce from "../models/CommerceModel.js";
import Product from "../models/ProductModel.js";
import { getAddressesByUser } from "./address.controller.js";
import Configuration from "../models/ConfigurationModel.js";

function getClientViewModel(req, title) {
  return {
    layout: "client-layout",
    title,
    user: req.session?.user ?? null
  };
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

export async function getCatalogue(req, res) {
  const { commerceId } = req.params;

  try {
    const [commerce, products, config] = await Promise.all([
      Commerce.findById(commerceId).lean(),
      Product.find({ commerceId })
        .populate("categoryId")
        .lean(),
      Configuration.findOne().lean()
    ]);

    if (!commerce) {
      req.flash("errors", "Comercio no encontrado");
      return res.redirect("/client/dashboard");
    }

    // Agrupar productos por categoría
    const byCategory = {};
    for (const product of products) {
      const catName = product.categoryId?.name ?? "Sin categoría";
      if (!byCategory[catName]) byCategory[catName] = [];
      byCategory[catName].push({
        ...product,
        imageUrl: resolveImageUrl(product.image, "/Images/products"),
        priceLabel: Number(product.price).toLocaleString("es-DO", {
          style: "currency",
          currency: "DOP"
        })
      });
    }

    const categories = Object.entries(byCategory).map(([name, items]) => ({
      name,
      items
    }));

    const itbisRate = config?.itbis ?? 18;

    // Leer el carrito de sesión si existe y es del mismo comercio
    const cart = req.session.cart?.commerceId === commerceId
      ? req.session.cart
      : { commerceId, items: [] };

    // Set de IDs ya en el carrito para saber cuáles deshabilitar
    const cartIds = new Set(cart.items.map(i => i.productId));

    const subtotal = cart.items.reduce((sum, i) => sum + i.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    return res.render("client/catalogue", {
      ...getClientViewModel(req, commerce.name),
      commerce: {
        ...commerce,
        logoUrl: resolveImageUrl(commerce.profileImage, "/Images/profileImages")
      },
      categories,
      hasCategories: categories.length > 0,
      cart: {
        items: cart.items,
        hasItems: cart.items.length > 0,
        subtotalLabel: subtotal.toLocaleString("es-DO", { style: "currency", currency: "DOP" }),
        itbisLabel: itbisAmount.toLocaleString("es-DO", { style: "currency", currency: "DOP" }),
        totalLabel: total.toLocaleString("es-DO", { style: "currency", currency: "DOP" })
      },
      cartIds: [...cartIds], 
      itbisRate
    });
  } catch (ex) {
    console.error("Error loading catalogue:", ex);
    req.flash("errors", "Error al cargar el catálogo");
    return res.redirect("/client/dashboard");
  }
}

export async function addToCart(req, res) {
  const { productId, name, price, commerceId } = req.body;

  if (!req.session.cart || req.session.cart.commerceId !== commerceId) {
    req.session.cart = { commerceId, items: [] };
  }

  const yaExiste = req.session.cart.items.find(i => i.productId === productId);
  if (!yaExiste) {
    req.session.cart.items.push({
      productId,
      name,
      price: Number(price)
    });
  }

  return res.redirect(`/client/catalogue/${commerceId}`);
}

export async function removeFromCart(req, res) {
  const { productId, commerceId } = req.body;

  if (req.session.cart) {
    req.session.cart.items = req.session.cart.items.filter(
      i => i.productId !== productId
    );
  }

  return res.redirect(`/client/catalogue/${commerceId}`);
}

export async function clearCart(req, res) {
  const { commerceId } = req.body;
  req.session.cart = null;
  return res.redirect(`/client/catalogue/${commerceId}`);
}

export async function getCheckout(req, res) {
  const { commerceId } = req.params;

  const cart = req.session.cart;
  if (!cart || cart.commerceId !== commerceId || cart.items.length === 0) {
    req.flash("errors", "No tienes productos en el carrito.");
    return res.redirect(`/client/catalogue/${commerceId}`);
  }

  try {
    const [commerce, addresses, config] = await Promise.all([
      Commerce.findById(commerceId).lean(),
      getAddressesByUser(req.session.user._id),
      Configuration.findOne().lean()
    ]);

    if (!commerce) {
      req.flash("errors", "Comercio no encontrado.");
      return res.redirect("/client/dashboard");
    }

    const itbisRate = config?.itbis ?? 18;
    const subtotal = cart.items.reduce((sum, i) => sum + i.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    return res.render("client/checkout", {
      ...getClientViewModel(req, "Confirmar pedido"),
      commerce: {
        ...commerce,
        logoUrl: resolveImageUrl(commerce.profileImage, "/Images/profileImages")
      },
      addresses,
      hasAddresses: addresses.length > 0,
      cart: {
        items: cart.items,
        subtotalLabel: subtotal.toLocaleString("es-DO", { style: "currency", currency: "DOP" }),
        itbisLabel: itbisAmount.toLocaleString("es-DO", { style: "currency", currency: "DOP" }),
        totalLabel: total.toLocaleString("es-DO", { style: "currency", currency: "DOP" }),
        subtotal,
        itbis: itbisAmount,
        total
      },
      itbisRate
    });
  } catch (ex) {
    console.error("Error loading checkout:", ex);
    return res.redirect(`/client/catalogue/${commerceId}`);
  }
}

export async function postCheckout(req, res) {
  const { commerceId, addressId } = req.body;

  const cart = req.session.cart;
  if (!cart || cart.commerceId !== commerceId || cart.items.length === 0) {
    req.flash("errors", "No tienes productos en el carrito.");
    return res.redirect(`/client/catalogue/${commerceId}`);
  }

  try {
    const [commerce, config] = await Promise.all([
      Commerce.findById(commerceId).lean(),
      Configuration.findOne().lean()
    ]);

    if (!commerce) {
      req.flash("errors", "Comercio no encontrado.");
      return res.redirect("/client/dashboard");
    }

    const itbisRate = config?.itbis ?? 18;
    const subtotal = cart.items.reduce((sum, i) => sum + i.price, 0);
    const itbisAmount = subtotal * (itbisRate / 100);
    const total = subtotal + itbisAmount;

    const Orders = (await import("../models/OrderModel.js")).default;

    await Orders.create({
      clientId: req.session.user._id,
      commerceId,
      addressId,
      products: cart.items,
      subtotal,
      itbis: itbisAmount,
      total,
      status: "pendiente"
    });

    req.session.cart = null;
    req.flash("success", "Pedido realizado correctamente.");
    return res.redirect("/client/dashboard");
  } catch (ex) {
    console.error("Error creating order:", ex);
    req.flash("errors", "Error al crear el pedido.");
    return res.redirect(`/client/checkout/${commerceId}`);
  }
}
