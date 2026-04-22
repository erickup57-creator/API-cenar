import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import { Roles } from "../utils/enums/roles.js";

export async function GetProfile(req, res, next) {
  try {
    const { id, role } = req.user;

    if (role === Roles.COMMERCE) {
      const commerce = await Commerce.findById(id)
        .select("-password -activateToken -resetToken -resetTokenExpiration")
        .lean();

      if (!commerce) {
        const error = new Error("Comercio no encontrado.");
        error.statusCode = 404;
        return next(error);
      }

      return res.status(200).json(commerce);
    }

    if (role === Roles.DELIVERY) {
      const delivery = await Delivery.findById(id)
        .select("-password -activateToken -resetToken -resetTokenExpiration")
        .lean();

      if (!delivery) {
        const error = new Error("Delivery no encontrado.");
        error.statusCode = 404;
        return next(error);
      }

      return res.status(200).json(delivery);
    }

    const user = await Users.findById(id)
      .select("-password -activateToken -resetToken -resetTokenExpiration")
      .lean();

    if (!user) {
      const error = new Error("Usuario no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

export async function UpdateProfile(req, res, next) {
  try {
    const { id, role } = req.user;

    if (role === Roles.COMMERCE) {
      const { email, phone, openingTime, closingTime } = req.body;
      const logo = req.file?.filename;

      const commerce = await Commerce.findById(id);

      if (!commerce) {
        const error = new Error("Comercio no encontrado.");
        error.statusCode = 404;
        return next(error);
      }

      commerce.email = email.toLowerCase();
      commerce.phone = phone;
      commerce.openingTime = openingTime;
      commerce.closingTime = closingTime;

      if (logo) {
        commerce.profileImage = logo;
      }

      await commerce.save();

      const updated = commerce.toObject();
      delete updated.password;
      delete updated.activateToken;
      delete updated.resetToken;
      delete updated.resetTokenExpiration;

      return res.status(200).json(updated);
    }

    const { firstName, lastName, phone } = req.body;
    const profileImage = req.file?.filename;

    const Model = role === Roles.DELIVERY ? Delivery : Users;

    const account = await Model.findById(id);

    if (!account) {
      const error = new Error("Usuario no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    account.name = firstName;
    account.lastName = lastName;
    account.phone = phone;

    if (profileImage) {
      account.profileImage = profileImage;
    }

    await account.save();

    const updated = account.toObject();
    delete updated.password;
    delete updated.activateToken;
    delete updated.resetToken;
    delete updated.resetTokenExpiration;

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}