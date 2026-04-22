import { randomBytes, scryptSync } from "node:crypto";
import { unlink } from "node:fs/promises";
import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import { Roles } from "../utils/enums/roles.js";
import { sendEmail } from "../services/EmailServices.js";
import { createDefaultAdmin } from "../services/DefaultUsers.js";
import bcypt from "bcrypt";

// render del login con mensajes opcionales
export function renderLoginPage(req, res) {
  const errors = req.flash("errors");

  createDefaultAdmin()
  
  return res.render("auth/login", {
    layout: "anonymous-layout",
    "page-title": "Login",
    registered: req.query.registered === "1",
    activated: req.query.activated === "1",
    errors,
    hasErrors: errors.length > 0
  });
}

export async function login(req, res) {
  const { identifier, password } = req.body;

  try {
    //si el usuario no existe, retorna el login con mensaje de error
    //el usuario se obtiene por email o username, se normaliza para evitar problemas de espacios o mayusculas
    const normalizedIdentifier = (identifier || "").trim().toLowerCase();

    const [regularUser, commerceUser, deliveryUser] = await Promise.all([
      Users.findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier }
        ]
      }),
      Commerce.findOne({ email: normalizedIdentifier }),
      Delivery.findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier }
        ]
      })
    ]);

    const user = regularUser || commerceUser || deliveryUser;

    if (!user) {
      req.flash("errors", "invalid credentials.");
      return res.redirect("/user/login");
    }
    //si existe pero no esta activo, retorna el login con mensaje de error
    if (!user.isActive) {
      req.flash("errors", "La cuenta no esta activada. Sigue las instrucciones en su correo.");
      return res.redirect("/user/login");
    }

    //si existe y esta activo, compara password,si no coincide, retorna el login con mensaje de error
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      req.flash("errors", "invalid password.");
      return res.redirect("/user/login");
    }

    //si todo es correcto, guarda el estado de autenticacion en la session y redirige segun rol
    req.session.user = user;
    req.session.isAuthenticated = true;

    req.session.save((ex) => {
      if (ex) {
        console.error("Error saving session after login", ex);
        return res.redirect("/user/login");
      }

      switch (user.role) {
        case Roles.CLIENT:
          return res.redirect("/client/dashboard");
        case Roles.DELIVERY:
          return res.redirect("/delivery/dashboard");
        case Roles.COMMERCE:
          return res.redirect("/commerce/dashboard");
        case Roles.ADMIN:
          return res.redirect("/AdminDashboard");
        default:
          req.flash("errors", "user role is not recognized.");
          return res.redirect("/user/login");
      }
    });
  } catch (ex) {
    console.error("Error during login", ex);
    req.flash("errors", "internal error during login");
    return res.redirect("/user/login");
  }
}

// normaliza texto y evita null
function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}
// genera hash de password con salt
function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

async function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;

  // Formato actual del registro: "salt:hash" (scrypt)
  if (storedPassword.includes(":")) {
    const [salt, savedHash] = storedPassword.split(":");
    if (!salt || !savedHash) return false;
    const computedHash = scryptSync(plainPassword, salt, 64).toString("hex");
    return computedHash === savedHash;
  }

  // Compatibilidad con posibles contraseÃ±as guardadas en bcrypt
  return bcypt.compare(plainPassword, storedPassword);
}

async function findAccountByIdentifier(identifier) {
  const normalizedIdentifier = sanitizeText(identifier).toLowerCase();
  if (!normalizedIdentifier) return null;

  const [regularUser, commerceUser, deliveryUser] = await Promise.all([
    Users.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
    }),
    Commerce.findOne({ email: normalizedIdentifier }),
    Delivery.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
    })
  ]);

  return regularUser || commerceUser || deliveryUser || null;
}

async function findAccountByResetToken({ token, userId = null }) {
  if (!token) return null;

  const models = [Users, Delivery, Commerce];
  const baseFilter = {
    resetToken: token,
    resetTokenExpiration: { $gt: new Date() }
  };

  for (const Model of models) {
    const filter = userId ? { ...baseFilter, _id: userId } : baseFilter;

    try {
      const account = await Model.findOne(filter);
      if (account) return account;
    } catch (ex) {
      if (ex?.name !== "CastError") {
        throw ex;
      }
    }
  }

  return null;
}

// arma url base para enlaces de activacion
function getBaseUrl(req) {
  const appUrl = sanitizeText(process.env.APP_URL);
  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

// render comun del formulario cliente o delivery
function renderRegisterView(res, { formData, errors, statusCode = 200 }) {
  return res.status(statusCode).render("auth/register", {
    layout: "anonymous-layout",
    "page-title": "Registro",
    formData,
    errors
  });
}

// elimina archivo subido cuando hay errores
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

// render del formulario inicial de registro
export function renderRegisterPage(req, res) {
  return renderRegisterView(res, {
    formData: {
      name: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      role: ""
    },
    errors: []
  });
}

// registro de cliente o delivery
export async function register(req, res) {
  const formData = {
    name: sanitizeText(req.body.name),
    lastName: sanitizeText(req.body.lastName),
    username: sanitizeText(req.body.username),
    email: sanitizeText(req.body.email).toLowerCase(),
    phone: sanitizeText(req.body.phone),
    role: sanitizeText(req.body.role)
  };
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
  const errors = [];
  const allowedRoles = [Roles.CLIENT, Roles.DELIVERY];

  // validaciones basicas de campos
  if (!formData.name) errors.push("El nombre es obligatorio.");
  if (!formData.lastName) errors.push("El apellido es obligatorio.");
  if (!formData.username) errors.push("El username es obligatorio.");
  if (!formData.email) errors.push("El email es obligatorio.");
  if (!formData.phone) errors.push("El telefono es obligatorio.");
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
  }
  if (!formData.role) errors.push("Debes seleccionar un rol.");
  if (formData.role && !allowedRoles.includes(formData.role)) {
    errors.push("El rol seleccionado no es valido.");
  }
  if (!password) errors.push("La contrasena es obligatoria.");
  if (!confirmPassword) errors.push("Debes confirmar la contrasena.");
  if (!req.file?.filename) errors.push("La foto de perfil es obligatoria.");

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push("El email no tiene un formato valido.");
  }

  if (password && password.length < 8) {
    errors.push("La contrasena debe tener al menos 8 caracteres.");
  }

  if (password && confirmPassword && password !== confirmPassword) {
    errors.push("Las contrasenas no coinciden.");
  }

  // si falla validacion, no sigue con db
  if (errors.length > 0) {
    await removeUploadedFile(req.file?.path);
    return renderRegisterView(res, { formData, errors, statusCode: 400 });
  }

  let createdUserId = null;
  let createdModel = null;

  try {
    // valida unicidad de email y username
    const [
      emailAlreadyExistsInUsers,
      emailAlreadyExistsInCommerces,
      emailAlreadyExistsInDeliveries,
      usernameAlreadyExistsInUsers,
      usernameAlreadyExistsInDeliveries
    ] = await Promise.all([
      Users.exists({ email: formData.email }),
      Commerce.exists({ email: formData.email }),
      Delivery.exists({ email: formData.email }),
      Users.exists({ username: formData.username }),
      Delivery.exists({ username: formData.username })
    ]);

    if (emailAlreadyExistsInUsers || emailAlreadyExistsInCommerces || emailAlreadyExistsInDeliveries) {
      errors.push("Ya existe una cuenta con ese email.");
    }
    if (usernameAlreadyExistsInUsers || usernameAlreadyExistsInDeliveries) {
      errors.push("Ese username ya esta en uso.");
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);
      return renderRegisterView(res, { formData, errors, statusCode: 409 });
    }

    // crea usuario inactivo y token de activacion
    const userPayload = {
      ...formData,
      password: hashPassword(password),
      role: formData.role,
      isActive: false,
      activateToken: randomBytes(32).toString("hex")
    };

    userPayload.profileImage = req.file.filename;

    const userRepository = formData.role === Roles.DELIVERY ? Delivery : Users;
    const createdUser = await userRepository.create(userPayload);
    createdUserId = createdUser._id;
    createdModel = userRepository;

    // envia correo con link para activar cuenta
    const activationLink = `${getBaseUrl(req)}/user/activate/${userPayload.activateToken}`;
    await sendEmail({
      to: formData.email,
      subject: "Activa tu cuenta",
      html: `
        <h2>Hola ${formData.name}</h2>
        <p>Tu cuenta fue creada correctamente y esta inactiva.</p>
        <p>Para activarla, haz click en el siguiente enlace:</p>
        <p><a href="${activationLink}">Activar cuenta</a></p>
      `
    });

    return res.redirect("/user/login?registered=1");
  } catch (ex) {
    // maneja errores de duplicados por indice unico
    if (ex?.code === 11000) {
      const duplicateFields = Object.keys(ex.keyPattern ?? {});

      if (duplicateFields.includes("email")) {
        errors.push("Ya existe una cuenta con ese email.");
      }
      if (duplicateFields.includes("username")) {
        errors.push("Ese username ya esta en uso.");
      }

      if (errors.length === 0) {
        errors.push("No se pudo crear la cuenta por datos duplicados.");
      }

      await removeUploadedFile(req.file?.path);
      return renderRegisterView(res, { formData, errors, statusCode: 409 });
    }

    // rollback si se creo usuario pero fallo despues
    if (createdUserId) {
      try {
        await createdModel.findByIdAndDelete(createdUserId);
      } catch (deleteError) {
        console.error("Error cleaning failed registration", deleteError);
      }
    }

    await removeUploadedFile(req.file?.path);
    console.error("Error creating user", ex);
    errors.push("No se pudo completar el registro o enviar el correo de activacion.");
    return renderRegisterView(res, { formData, errors, statusCode: 500 });
  }
}

// activa cuenta usando token por url
export async function activateAccount(req, res) {
  const token = sanitizeText(req.params.token);

  if (!token) {
    return res.status(400).send("Token de activacion invalido.");
  }

  try {
    let user = await Users.findOne({ activateToken: token });
    if (!user) {
      user = await Commerce.findOne({ activateToken: token });
    }
    if (!user) {
      user = await Delivery.findOne({ activateToken: token });
    }

    if (!user) {
      return res.status(404).send("El enlace de activacion no es valido o ya expiro.");
    }

    user.isActive = true;
    user.activateToken = null;
    await user.save();

    return res.redirect("/user/login?activated=1");
  } catch (ex) {
    console.error("Error activando el usuaroi ", ex);
    return res.status(500).send("Error interno al activar la cuenta.");
  }
}

export function logout(req, res) {
  if (!req.session) {
    return res.redirect("/user/login");
  }

  req.session.destroy((ex) => {
    if (ex) {
      console.error("Error closing session", ex);
    }

    res.clearCookie("connect.sid");
    return res.redirect("/user/login");
  });
}

export function renderForgotPasswordPage(req, res) {
  return res.render("auth/forgot-password", {
    layout: "anonymous-layout",
    "page-title": "Restablecer contraseÃ±a",
    formData: { identifier: "" },
    errors: [],
    success: false
  });
}

export async function forgotPassword(req, res) {
  const identifier = sanitizeText(req.body.identifier).toLowerCase();
  const errors = [];

  if (!identifier) errors.push("El usuario o correo es obligatorio.");

  if (errors.length > 0) {
    return res.render("auth/forgot-password", {
      layout: "anonymous-layout",
      "page-title": "Restablecer contraseÃ±a",
      formData: { identifier },
      errors,
      success: false
    });
  }

  try {
    const user = await findAccountByIdentifier(identifier);

    // Si no existe igual mostramos success para no revelar si el usuario existe
    if (user) {
      const resetToken = randomBytes(32).toString("hex");
      user.resetToken = resetToken;
      user.resetTokenExpiration = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
      await user.save();

      const resetLink = `${getBaseUrl(req)}/user/reset-password/${resetToken}`;
      await sendEmail({
        to: user.email,
        subject: "Restablece tu contraseÃ±a en AppCenar",
        html: `
          <h2>Hola, ${user.name}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseÃ±a.</p>
          <p>Haz click en el siguiente enlace para continuar:</p>
          <p><a href="${resetLink}">Restablecer contraseÃ±a</a></p>
          <p>Este enlace expira en 1 hora.</p>
        `
      });
    }

    return res.render("auth/forgot-password", {
      layout: "anonymous-layout",
      "page-title": "Restablecer contraseÃ±a",
      formData: { identifier: "" },
      errors: [],
      success: true
    });
  } catch (ex) {
    console.error("Error en forgot password", ex);
    return res.render("auth/forgot-password", {
      layout: "anonymous-layout",
      "page-title": "Restablecer contraseÃ±a",
      formData: { identifier },
      errors: ["No se pudo procesar la solicitud."],
      success: false
    });
  }
}
export async function renderResetPasswordPage(req, res) {
  const token = sanitizeText(req.params.token);

  const user = await findAccountByResetToken({
    token
  });

  if (!user) {
    return res.status(404).render("404", {
      layout: "anonymous-layout",
      title: "Enlace invalido o expirado"
    });
  }

  return res.render("auth/reset-password", {
    layout: "anonymous-layout",
    "page-title": "Nueva contraseÃ±a",
    passwordToken: token,
    userId: user._id,
    errors: []
  });
}

export async function resetPassword(req, res) {
  const token = sanitizeText(req.body.passwordToken);
  const userId = sanitizeText(req.body.userId);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
  const errors = [];

  if (!password) errors.push("La contrasena es obligatoria.");
  if (!confirmPassword) errors.push("Debes confirmar la contrasena.");
  if (password && password.length < 8) errors.push("La contrasena debe tener al menos 8 caracteres.");
  if (password && confirmPassword && password !== confirmPassword) errors.push("Las contrasenas no coinciden.");

  if (errors.length > 0) {
    return res.render("auth/reset-password", {
      layout: "anonymous-layout",
      "page-title": "Nueva contraseÃ±a",
      passwordToken: token,
      userId,
      errors
    });
  }

  try {
    const user = await findAccountByResetToken({
      token,
      userId
    });

    if (!user) {
      return res.status(404).render("404", {
        layout: "anonymous-layout",
        title: "Enlace invalido o expirado"
      });
    }

    user.password = hashPassword(password);
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();

    return res.redirect("/user/login?activated=1");
  } catch (ex) {
    console.error("Error resetting password", ex);
    return res.render("auth/reset-password", {
      layout: "anonymous-layout",
      "page-title": "Nueva contraseÃ±a",
      passwordToken: token,
      userId,
      errors: ["No se pudo restablecer la contrasena."]
    });
  }
}

