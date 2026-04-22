import { randomBytes, scryptSync } from "node:crypto";
import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import Order from "../models/OrderModel.js";
import { Roles } from "../utils/enums/roles.js";

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEFAULT_ADMIN_EMAIL = "admin@appcenar.com";

function isDefaultAdmin(user) {
  return user.role === Roles.ADMIN && user.email === DEFAULT_ADMIN_EMAIL;
}

function buildPagination(query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

export async function getClients(req, res, next) {
  try {
    const { search = "", isActive } = req.query;
    const { page, limit, skip } = buildPagination(req.query);

    const filter = {
      role: Roles.CLIENT,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      })
    };

    const active = parseBoolean(isActive);
    if (active !== undefined) filter.isActive = active;

    const [users, total] = await Promise.all([
      Users.find(filter)
        .select("name lastName phone email isActive")
        .skip(skip)
        .limit(limit)
        .lean(),
      Users.countDocuments(filter)
    ]);

    const data = await Promise.all(
      users.map(async (user) => {
        const ordersCount = await Order.countDocuments({
          client: user._id
        });

        return {
          id: user._id,
          firstName: user.name,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          isActive: user.isActive,
          ordersCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdministrators(req, res, next) {
  try {
    const { page, limit, skip } = buildPagination(req.query);

    const filter = { role: Roles.ADMIN };

    const [admins, total] = await Promise.all([
      Users.find(filter)
        .select("name lastName username email phone isActive")
        .skip(skip)
        .limit(limit)
        .lean(),
      Users.countDocuments(filter)
    ]);

    const data = admins.map((admin) => ({
      id: admin._id,
      name: admin.name,
      lastName: admin.lastName,
      username: admin.username,
      email: admin.email,
      phone: admin.phone,
      isActive: admin.isActive,
      isDefaultAdmin: admin.email === DEFAULT_ADMIN_EMAIL,
      canEdit: admin.email !== DEFAULT_ADMIN_EMAIL
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdministrator(req, res, next) {
  try {
    const { firstName, lastName, userName, email, password, phone } =
      req.body;

    const exists = await Users.findOne({
      $or: [{ email: email.toLowerCase() }, { username: userName }]
    });

    if (exists) {
      const error = new Error("Email o username ya existe.");
      error.statusCode = 409;
      return next(error);
    }

    const admin = await Users.create({
      name: firstName,
      lastName,
      username: userName,
      email: email.toLowerCase(),
      password: hashPassword(password),
      phone,
      role: Roles.ADMIN,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Administrador creado correctamente.",
      data: {
        id: admin._id,
        name: admin.name,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdministrator(req, res, next) {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      const error = new Error("No puedes editarte a ti mismo.");
      error.statusCode = 400;
      return next(error);
    }

    const admin = await Users.findById(id);
    if (!admin || admin.role !== Roles.ADMIN) {
      const error = new Error("Administrador no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    if (isDefaultAdmin(admin)) {
      const error = new Error("El admin por defecto no puede modificarse.");
      error.statusCode = 403;
      return next(error);
    }

    const { firstName, lastName, userName, email, phone } = req.body;

    if (email && email.toLowerCase() !== admin.email) {
      const exists = await Users.exists({
        email: email.toLowerCase(),
        _id: { $ne: id }
      });

      if (exists) {
        const error = new Error("Email ya está en uso.");
        error.statusCode = 409;
        return next(error);
      }

      admin.email = email.toLowerCase();
    }

    if (userName && userName !== admin.username) {
      const exists = await Users.exists({
        username: userName,
        _id: { $ne: id }
      });

      if (exists) {
        const error = new Error("Username ya está en uso.");
        error.statusCode = 409;
        return next(error);
      }

      admin.username = userName;
    }

    if (firstName) admin.name = firstName;
    if (lastName) admin.lastName = lastName;
    if (phone) admin.phone = phone;

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Administrador actualizado correctamente.",
      data: {
        id: admin._id,
        name: admin.name,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const isActive = parseBoolean(req.body.isActive);

    if (req.user.id === id) {
      const error = new Error("No puedes cambiar tu propio estado.");
      error.statusCode = 400;
      return next(error);
    }

    let user =
      (await Users.findById(id)) ||
      (await Commerce.findById(id)) ||
      (await Delivery.findById(id));

    if (!user) {
      const error = new Error("Usuario no encontrado.");
      error.statusCode = 404;
      return next(error);
    }

    if (user.role === Roles.ADMIN && isDefaultAdmin(user)) {
      const error = new Error("El admin por defecto no puede modificarse.");
      error.statusCode = 403;
      return next(error);
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Usuario ${isActive ? "activado" : "inactivado"} correctamente.`
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeliveries(req, res, next) {
  try {
    const { search = "", isActive } = req.query;
    const { page, limit, skip } = buildPagination(req.query);

    const filter = {
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      })
    };

    const active = parseBoolean(isActive);
    if (active !== undefined) filter.isActive = active;

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .select("name lastName phone email isActive deliveryStatus")
        .skip(skip).limit(limit).lean(),
      Delivery.countDocuments(filter)
    ]);

    const data = deliveries.map((d) => ({
      id: d._id,
      firstName: d.name,
      lastName: d.lastName,
      phone: d.phone,
      email: d.email,
      isActive: d.isActive,
      deliveryStatus: d.deliveryStatus
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
}

export async function getCommerces(req, res, next) {
  try {
    const { search = "", isActive } = req.query;
    const { page, limit, skip } = buildPagination(req.query);

    const filter = {
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      })
    };

    const active = parseBoolean(isActive);
    if (active !== undefined) filter.isActive = active;

    const [commerces, total] = await Promise.all([
      Commerce.find(filter)
        .select("name email phone isActive commerceType")
        .populate("commerceType", "name")
        .skip(skip).limit(limit).lean(),
      Commerce.countDocuments(filter)
    ]);

    const data = commerces.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      isActive: c.isActive,
      commerceType: c.commerceType?.name ?? null
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
}