import { randomBytes, scryptSync } from "node:crypto";
import { unlink } from "node:fs/promises";
import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import CommerceType from "../models/CommerceTypeModel.js";
import { sendEmail } from "../services/EmailServices.js";

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

// arma url base para enlaces de activacion
function getBaseUrl(req) {
  const appUrl = sanitizeText(process.env.APP_URL);
  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
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

// render del formulario de registro de comercio
export async function renderRegisterCommercePage(req, res) {
  return renderRegisterCommerceView(res, {
    formData: { nombre: "", telefono: "", correo: "", horaApertura: "", horaCierre: "", tipoComercio: "" },
    errors: []
  });
}

// render comun del formulario de comercio
async function renderRegisterCommerceView(res, { formData, errors, statusCode = 200 }) {
  const commerceTypes = await CommerceType.find().lean();
  return res.status(statusCode).render("auth/register-commerce", {
    layout: "anonymous-layout",
    "page-title": "Registrar comercio",
    formData,
    errors,
    commerceTypes
  });
}

// registro de comercio
export async function registerCommerce(req, res) {
  const formData = {
    nombre: sanitizeText(req.body.nombre),
    telefono: sanitizeText(req.body.telefono),
    correo: sanitizeText(req.body.correo).toLowerCase(),
    horaApertura: sanitizeText(req.body.horaApertura),
    horaCierre: sanitizeText(req.body.horaCierre),
    tipoComercio: sanitizeText(req.body.tipoComercio)
  };
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
  const errors = [];

  // validaciones basicas del formulario
  if (!formData.nombre) errors.push("El nombre del comercio es obligatorio.");
  if (!formData.telefono) errors.push("El telefono es obligatorio.");
  if (formData.telefono && !isValidPhone(formData.telefono)) {
    errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
  }
  if (!formData.correo) errors.push("El correo es obligatorio.");
  if (!formData.horaApertura) errors.push("La hora de apertura es obligatoria.");
  if (!formData.horaCierre) errors.push("La hora de cierre es obligatoria.");
  if (!formData.tipoComercio) errors.push("Debes seleccionar un tipo de comercio.");
  if (!password) errors.push("La contrasena es obligatoria.");
  if (!confirmPassword) errors.push("Debes confirmar la contrasena.");
  if (!req.file?.filename) errors.push("El logo del comercio es obligatorio.");

  if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
    errors.push("El correo no tiene un formato valido.");
  }
  if (password && password.length < 8) errors.push("La contrasena debe tener al menos 8 caracteres.");
  if (password && confirmPassword && password !== confirmPassword) errors.push("Las contrasenas no coinciden.");

  // si falla validacion, regresa con errores
  if (errors.length > 0) {
    await removeUploadedFile(req.file?.path);
    return renderRegisterCommerceView(res, { formData, errors, statusCode: 400 });
  }

  let createdUserId = null;

  try {
    // valida tipo de comercio y correo unico
    const [
      commerceType,
      emailAlreadyExistsInUsers,
      emailAlreadyExistsInCommerces,
      emailAlreadyExistsInDeliveries
    ] = await Promise.all([
      CommerceType.exists({ _id: formData.tipoComercio }),
      Users.exists({ email: formData.correo }),
      Commerce.exists({ email: formData.correo }),
      Delivery.exists({ email: formData.correo })
    ]);

    if (!commerceType) errors.push("El tipo de comercio seleccionado no es valido.");
    if (emailAlreadyExistsInUsers || emailAlreadyExistsInCommerces || emailAlreadyExistsInDeliveries) {
      errors.push("Ya existe una cuenta con ese correo.");
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file?.path);
      return renderRegisterCommerceView(res, { formData, errors, statusCode: 409 });
    }

    // crea cuenta de comercio inactiva
    const activateToken = randomBytes(32).toString("hex");

    const createdUser = await Commerce.create({
      name: formData.nombre,
      email: formData.correo,
      phone: formData.telefono,
      openingTime: formData.horaApertura,
      closingTime: formData.horaCierre,
      commerceType: formData.tipoComercio,
      profileImage: req.file.filename,
      password: hashPassword(password),
      isActive: false,
      activateToken
    });

    createdUserId = createdUser._id;

    // envia correo de activacion
    const activationLink = `${getBaseUrl(req)}/user/activate/${activateToken}`;
    try {
      await sendEmail({
        to: formData.correo,
        subject: "Activa tu comercio en AppCenar",
        html: `
          <h2>Hola, ${formData.nombre}</h2>
          <p>Tu comercio fue registrado correctamente y esta inactivo.</p>
          <p>Para activarlo, haz click en el siguiente enlace:</p>
          <p><a href="${activationLink}">Activar comercio</a></p>
        `
      });
    } catch (emailError) {
      throw emailError;
    }

    return res.redirect("/user/login?registered=1");
  } catch (ex) {
    // maneja duplicados de email en mongo
    if (ex?.code === 11000) {
      const duplicateFields = Object.keys(ex.keyPattern ?? {});
      if (duplicateFields.includes("email")) errors.push("Ya existe una cuenta con ese correo.");
      if (errors.length === 0) errors.push("No se pudo crear el comercio por datos duplicados.");
      await removeUploadedFile(req.file?.path);
      return renderRegisterCommerceView(res, { formData, errors, statusCode: 409 });
    }

    // rollback si se creo usuario y luego fallo
    if (createdUserId) {
      try {
        await Commerce.findByIdAndDelete(createdUserId);
      } catch (deleteError) {
        console.error("Error cleaning failed commerce registration", deleteError);
      }
    }

    await removeUploadedFile(req.file?.path);
    console.error("Error creating commerce", ex);
    errors.push("No se pudo completar el registro o enviar el correo de activacion.");
    return renderRegisterCommerceView(res, { formData, errors, statusCode: 500 });
  }
}
