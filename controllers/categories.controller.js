import Category from "../models/CategoryModel.js";
import Product from "../models/ProductModel.js";

function buildCategoryPayload(body) {
  return {
    name: body.name,
    description: body.description
  };
}

function duplicateCategoryError() {
  const error = new Error("Ya existe una categoria con ese nombre.");
  error.statusCode = 400;
  return error;
}

async function addProductCount(category) {
  const productCount = await Product.countDocuments({
    commerceId: category.commerceId,
    categoryId: category._id
  });

  return {
    ...category,
    productCount
  };
}

export async function GetMyCategories(req, res, next) {
  try {
    const categories = await Category.find({ commerceId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(categories.map(addProductCount));

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function GetCategoryById(req, res, next) {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      commerceId: req.user.id
    }).lean();

    if (!category) {
      const error = new Error("Categoria no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(await addProductCount(category));
  } catch (error) {
    return next(error);
  }
}

export async function CreateCategory(req, res, next) {
  try {
    const category = await Category.create({
      ...buildCategoryPayload(req.body),
      commerceId: req.user.id
    });

    return res.status(201).json(await addProductCount(category.toObject()));
  } catch (error) {
    if (error?.code === 11000) {
      return next(duplicateCategoryError());
    }
    return next(error);
  }
}

export async function UpdateCategory(req, res, next) {
  try {
    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        commerceId: req.user.id
      },
      buildCategoryPayload(req.body),
      {
        new: true,
        runValidators: true
      }
    ).lean();

    if (!category) {
      const error = new Error("Categoria no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(await addProductCount(category));
  } catch (error) {
    if (error?.code === 11000) {
      return next(duplicateCategoryError());
    }
    return next(error);
  }
}

export async function DeleteCategory(req, res, next) {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      commerceId: req.user.id
    }).lean();

    if (!category) {
      const error = new Error("Categoria no encontrada.");
      error.statusCode = 404;
      return next(error);
    }

    const productCount = await Product.countDocuments({
      commerceId: req.user.id,
      categoryId: category._id
    });

    if (productCount > 0) {
      const error = new Error("No se puede eliminar una categoria con productos asociados.");
      error.statusCode = 400;
      return next(error);
    }

    await Category.deleteOne({
      _id: category._id,
      commerceId: req.user.id
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
