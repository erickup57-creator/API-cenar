import Category from "../models/CategoryModel.js";
import Product from "../models/ProductModel.js";

const categoryPublicFields = "name description";

function buildProductPayload(body) {
  return {
    name: body.name,
    description: body.description,
    price: Number(body.price),
    categoryId: body.categoryId
  };
}

function productNotFoundError() {
  const error = new Error("Producto no encontrado.");
  error.statusCode = 404;
  return error;
}

function categoryNotFoundError() {
  const error = new Error("Categoria no encontrada.");
  error.statusCode = 404;
  return error;
}

function productListQuery(filter) {
  return Product.find(filter).populate({
    path: "categoryId",
    select: categoryPublicFields
  });
}

function productByIdQuery(id) {
  return Product.findById(id).populate({
    path: "categoryId",
    select: categoryPublicFields
  });
}

function productOneQuery(filter) {
  return Product.findOne(filter).populate({
    path: "categoryId",
    select: categoryPublicFields
  });
}

async function ensureCategoryBelongsToCommerce(categoryId, commerceId) {
  const category = await Category.exists({
    _id: categoryId,
    commerceId
  });

  if (!category) {
    throw categoryNotFoundError();
  }
}

export async function GetMyProducts(req, res, next) {
  try {
    const products = await productListQuery({ commerceId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    return next(error);
  }
}

export async function GetProductById(req, res, next) {
  try {
    const product = await productOneQuery({
        _id: req.params.id,
        commerceId: req.user.id
      })
      .lean();

    if (!product) {
      return next(productNotFoundError());
    }

    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
}

export async function CreateProduct(req, res, next) {
  try {
    await ensureCategoryBelongsToCommerce(req.body.categoryId, req.user.id);

    const product = await Product.create({
      ...buildProductPayload(req.body),
      commerceId: req.user.id,
      image: req.file.filename
    });

    const created = await productByIdQuery(product._id)
      .lean();

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

export async function UpdateProduct(req, res, next) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      commerceId: req.user.id
    });

    if (!product) {
      return next(productNotFoundError());
    }

    await ensureCategoryBelongsToCommerce(req.body.categoryId, req.user.id);

    Object.assign(product, buildProductPayload(req.body));

    if (req.file) {
      product.image = req.file.filename;
    }

    await product.save();

    const updated = await productByIdQuery(product._id)
      .lean();

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

export async function DeleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      commerceId: req.user.id
    });

    if (!product) {
      return next(productNotFoundError());
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
