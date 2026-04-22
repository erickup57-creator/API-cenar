import { randomBytes, scryptSync } from "node:crypto";
import jwt from "jsonwebtoken";
import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import CommerceType from "../models/CommerceTypeModel.js";
import { Roles } from "../utils/enums/roles.js";
import { sendEmail } from "../services/EmailServices.js";

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  if (!plain || !stored) return false;
  const [salt, savedHash] = stored.split(":");
  if (!salt || !savedHash) return false;
  const computedHash = scryptSync(plain, salt, 64).toString("hex");
  return computedHash === savedHash;
}

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
}

function getBaseUrl(req) {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

async function findAccountByIdentifier(identifier) {
  const normalized = identifier.trim().toLowerCase();

  const [user, commerce, delivery] = await Promise.all([
    Users.findOne({
      $or: [{ email: normalized }, { username: normalized }]
    }),
    Commerce.findOne({ email: normalized }),
    Delivery.findOne({
      $or: [{ email: normalized }, { username: normalized }]
    })
  ]);

  return user || commerce || delivery || null;
}

async function findAccountByResetToken(token) {
  const filter = {
    resetToken: token,
    resetTokenExpiration: { $gt: new Date() }
  };

  const [user, commerce, delivery] = await Promise.all([
    Users.findOne(filter),
    Commerce.findOne(filter),
    Delivery.findOne(filter)
  ]);

  return user || commerce || delivery || null;
}

export async function Login(req, res, next) {
  try {
    const { userNameOrEmail, password } = req.body;

    const user = await findAccountByIdentifier(userNameOrEmail);

    if (!user) {
      const error = new Error("Credenciales inválidas.");
      error.statusCode = 401;
      return next(error);
    }

    if (!user.isActive) {
      const error = new Error("Cuenta inactiva. Revisa tu correo para activarla.");
      error.statusCode = 401;
      return next(error);
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      const error = new Error("Credenciales inválidas.");
      error.statusCode = 401;
      return next(error);
    }

    const token = generateToken(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return res.status(200).json({
      token,
      expiresAt,
      user: {
        id: user._id,
        userName: user.username || user.email,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function RegisterClient(req, res, next) {
  try {
    const { firstName, lastName, userName, email, password, phone } = req.body;
    const profileImage = req.file?.filename || null;

    const [emailExists, userNameExists] = await Promise.all([
      Users.exists({ email: email.toLowerCase() }),
      Users.exists({ username: userName })
    ]);

    if (emailExists || userNameExists) {
      const error = new Error(
        emailExists ? "El correo ya está en uso." : "El nombre de usuario ya está en uso."
      );
      error.statusCode = 409;
      return next(error);
    }

    const activateToken = randomBytes(32).toString("hex");

    await Users.create({
      name: firstName,
      lastName,
      username: userName,
      email: email.toLowerCase(),
      password: hashPassword(password),
      phone,
      profileImage,
      role: Roles.CLIENT,
      isActive: false,
      activateToken
    });

    const activationLink = `${getBaseUrl(req)}/api/auth/confirm-email`;

    await sendEmail({
      to: email,
      subject: "Activa tu cuenta en ApiCenar",
      html: `
        <h2>Hola ${firstName}</h2>
        <p>Tu cuenta fue creada. Para activarla haz una petición POST a:</p>
        <p><strong>${activationLink}</strong></p>
        <p>Con el siguiente token:</p>
        <p><strong>${activateToken}</strong></p>
      `
    });

    return res.status(201).json({
      message: "Cliente registrado correctamente. Revisa tu correo para activar tu cuenta."
    });
  } catch (error) {
    return next(error);
  }
}

export async function RegisterDelivery(req, res, next) {
  try {
    const { firstName, lastName, userName, email, password, phone } = req.body;
    const profileImage = req.file?.filename || null;

    const [emailExists, userNameExists] = await Promise.all([
      Delivery.exists({ email: email.toLowerCase() }),
      Delivery.exists({ username: userName })
    ]);

    if (emailExists || userNameExists) {
      const error = new Error(
        emailExists ? "El correo ya está en uso." : "El nombre de usuario ya está en uso."
      );
      error.statusCode = 409;
      return next(error);
    }

    const activateToken = randomBytes(32).toString("hex");

    await Delivery.create({
      name: firstName,
      lastName,
      username: userName,
      email: email.toLowerCase(),
      password: hashPassword(password),
      phone,
      profileImage,
      role: Roles.DELIVERY,
      isActive: false,
      deliveryStatus: "disponible",
      activateToken
    });

    const activationLink = `${getBaseUrl(req)}/api/auth/confirm-email`;

    await sendEmail({
      to: email,
      subject: "Activa tu cuenta en ApiCenar",
      html: `
        <h2>Hola ${firstName}</h2>
        <p>Tu cuenta de delivery fue creada. Para activarla haz una petición POST a:</p>
        <p><strong>${activationLink}</strong></p>
        <p>Con el siguiente token:</p>
        <p><strong>${activateToken}</strong></p>
      `
    });

    return res.status(201).json({
      message: "Delivery registrado correctamente. Revisa tu correo para activar tu cuenta."
    });
  } catch (error) {
    return next(error);
  }
}

export async function RegisterCommerce(req, res, next) {
  try {
    const {
      userName,
      email,
      password,
      name,
      phone,
      openingTime,
      closingTime,
      commerceTypeId,
      description
    } = req.body;
    const logo = req.file?.filename || null;

    const commerceTypeExists = await CommerceType.exists({ _id: commerceTypeId });
    if (!commerceTypeExists) {
      const error = new Error("El tipo de comercio no existe.");
      error.statusCode = 400;
      return next(error);
    }

    const emailExists = await Commerce.exists({ email: email.toLowerCase() });
    if (emailExists) {
      const error = new Error("El correo ya está en uso.");
      error.statusCode = 409;
      return next(error);
    }

    const activateToken = randomBytes(32).toString("hex");

    await Commerce.create({
      name,
      email: email.toLowerCase(),
      password: hashPassword(password),
      phone,
      openingTime,
      closingTime,
      commerceType: commerceTypeId,
      profileImage: logo,
      description,
      role: Roles.COMMERCE,
      isActive: false,
      activateToken
    });

    const activationLink = `${getBaseUrl(req)}/api/auth/confirm-email`;

    await sendEmail({
      to: email,
      subject: "Activa tu comercio en ApiCenar",
      html: `
        <h2>Hola ${name}</h2>
        <p>Tu comercio fue registrado. Para activarlo haz una petición POST a:</p>
        <p><strong>${activationLink}</strong></p>
        <p>Con el siguiente token:</p>
        <p><strong>${activateToken}</strong></p>
      `
    });

    return res.status(201).json({
      message: "Comercio registrado correctamente. Revisa tu correo para activar tu cuenta."
    });
  } catch (error) {
    return next(error);
  }
}

export async function ConfirmEmail(req, res, next) {
  try {
    const { token } = req.body;

    const [user, commerce, delivery] = await Promise.all([
      Users.findOne({ activateToken: token }),
      Commerce.findOne({ activateToken: token }),
      Delivery.findOne({ activateToken: token })
    ]);

    const account = user || commerce || delivery;

    if (!account) {
      const error = new Error("Token inválido o expirado.");
      error.statusCode = 400;
      return next(error);
    }

    account.isActive = true;
    account.activateToken = null;
    await account.save();

    return res.status(200).json({
      message: "Cuenta activada correctamente. Ya puedes iniciar sesión."
    });
  } catch (error) {
    return next(error);
  }
}

export async function ForgotPassword(req, res, next) {
  try {
    const { userNameOrEmail } = req.body;

    const account = await findAccountByIdentifier(userNameOrEmail);

    if (account) {
      const resetToken = randomBytes(32).toString("hex");
      account.resetToken = resetToken;
      account.resetTokenExpiration = new Date(Date.now() + 60 * 60 * 1000);
      await account.save();

      const resetLink = `${getBaseUrl(req)}/api/auth/reset-password`;

      await sendEmail({
        to: account.email,
        subject: "Restablece tu contraseña en ApiCenar",
        html: `
          <h2>Hola ${account.name}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Haz una petición POST a:</p>
          <p><strong>${resetLink}</strong></p>
          <p>Con el siguiente token:</p>
          <p><strong>${resetToken}</strong></p>
          <p>Este enlace expira en 1 hora.</p>
        `
      });
    }

    return res.status(200).json({
      message: "Si el usuario existe, recibirás un correo con instrucciones."
    });
  } catch (error) {
    return next(error);
  }
}

export async function ResetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    const account = await findAccountByResetToken(token);

    if (!account) {
      const error = new Error("Token inválido o expirado.");
      error.statusCode = 400;
      return next(error);
    }

    account.password = hashPassword(password);
    account.resetToken = null;
    account.resetTokenExpiration = null;
    await account.save();

    return res.status(200).json({
      message: "Contraseña restablecida correctamente."
    });
  } catch (error) {
    return next(error);
  }
}