import CommerceType from "../models/CommerceTypeModel.js";
import Commerce from "../models/CommerceModel.js";
import Product from "../models/ProductModel.js";
import Category from "../models/CategoryModel.js";
import Order from "../models/OrderModel.js";
import Favorite from "../models/FavoriteModel.js";

export const getCommerceTypes = async (req, res, next) => {
  try {
    const commerceTypes = await CommerceType.find().lean();

    return res.status(200).json({
      success: true,
      data: commerceTypes
    });
  } catch (error) {
    next(error);
  }
};

export const getCommerceTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const commerceType = await CommerceType.findById(id).lean();

    if (!commerceType) {
      return res.status(404).json({
        success: false,
        message: "Commerce type not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: commerceType
    });
  } catch (error) {
    next(error);
  }
};

export const createCommerceType = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Icon is required"
      });
    }

    const exists = await CommerceType.findOne({ name: name.trim() });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Commerce type already exists"
      });
    }

    const commerceType = await CommerceType.create({
      name: name.trim(),
      icon: req.file.path
    });

    return res.status(201).json({
      success: true,
      message: "Commerce type created successfully",
      data: commerceType
    });
  } catch (error) {
    next(error);
  }
};

export const updateCommerceType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const commerceType = await CommerceType.findById(id);

    if (!commerceType) {
      return res.status(404).json({
        success: false,
        message: "Commerce type not found"
      });
    }

    if (name?.trim()) {
      const duplicated = await CommerceType.findOne({
        name: name.trim(),
        _id: { $ne: id }
      });

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: "Commerce type already exists"
        });
      }

      commerceType.name = name.trim();
    }

    if (req.file) {
      commerceType.icon = req.file.path;
    }

    await commerceType.save();

    return res.status(200).json({
      success: true,
      message: "Commerce type updated successfully",
      data: commerceType
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCommerceType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const commerceType = await CommerceType.findById(id);

    if (!commerceType) {
      return res.status(404).json({
        success: false,
        message: "Commerce type not found"
      });
    }

    const commerces = await Commerce.find({ commerceType: id }).lean();
    const commerceIds = commerces.map((c) => c._id);

    await Favorite.deleteMany({ commerce: { $in: commerceIds } });
    await Order.deleteMany({ commerce: { $in: commerceIds } });
    await Product.deleteMany({ commerce: { $in: commerceIds } });
    await Category.deleteMany({ commerce: { $in: commerceIds } });
    await Commerce.deleteMany({ _id: { $in: commerceIds } });

    await CommerceType.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Commerce type deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};