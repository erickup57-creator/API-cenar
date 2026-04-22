import { randomBytes, scryptSync } from "crypto";
import Users from "../models/UserModel.js";
import { Roles } from "../utils/enums/roles.js";

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}

function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hashedPassword}`;
}

function getLoggedAdminId(req) {
  return req.session?.user?._id ? String(req.session.user._id) : null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

//#region DASHBOARD
export async function getAdminDashboard(req, res, next) {
  try {
    const loggedUserId = getLoggedAdminId(req);

    const result = await Users.find(
      { role: Roles.ADMIN },
      {
        name: 1,
        lastName: 1,
        username: 1,
        email: 1,
        cedula: 1,
        phone: 1,
        isActive: 1
      }
    ).lean();

    const admins = (result || []).map((admin) => {
      const canManage = !(loggedUserId && String(admin._id) === loggedUserId);

      return {
        ...admin,
        canEdit: canManage,
        canToggleStatus: canManage
      };
    });

    return res.render("Admin/Index", {
      adminList: admins,
      hasAdmin: admins.length > 0,
      layout: "admin-layout",
      "page-title": "Admin Dashboard"
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    req.flash("error", "Ocurrio un error cargando los administradores.");
    return res.redirect("/");
  }
}
//#endregion

//#region SAVE
export async function getAdminSave(req, res, next) {
  return res.render("Admin/Save", {
    editMode: false,
    formData: {},
    errors: [],
    layout: "admin-layout",
    "page-title": "Agregar Administrador"
  });
}

export async function postAdminSave(req, res, next) {
  const formData = {
    name: sanitizeText(req.body.name),
    lastName: sanitizeText(req.body.lastName),
    username: sanitizeText(req.body.username),
    email: sanitizeText(req.body.email).toLowerCase(),
    cedula: sanitizeText(req.body.cedula),
    phone: sanitizeText(req.body.phone)
  };

  const password = typeof req.body.password === "string" ? req.body.password.trim() : "";
  const confirmPassword =
    typeof req.body.confirmPassword === "string" ? req.body.confirmPassword.trim() : "";

  const errors = [];

  if (!formData.name) errors.push("El nombre es obligatorio.");
  if (!formData.lastName) errors.push("El apellido es obligatorio.");
  if (!formData.username) errors.push("El usuario es obligatorio.");
  if (!formData.email) errors.push("El correo es obligatorio.");
  if (!formData.cedula) errors.push("La cedula es obligatoria.");
  if (!formData.phone) errors.push("El telefono es obligatorio.");
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
  }
  if (!password) errors.push("La contrasena es obligatoria.");
  if (!confirmPassword) errors.push("Debes confirmar la contrasena.");

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push("El correo no es valido.");
  }

  if (password && password.length < 8) {
    errors.push("La contrasena debe tener al menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    errors.push("Las contrasenas no coinciden.");
  }

  try {
    const [emailExists, usernameExists] = await Promise.all([
      Users.exists({ email: formData.email }),
      Users.exists({ username: formData.username })
    ]);

    if (emailExists) errors.push("Ya existe un usuario con ese correo.");
    if (usernameExists) errors.push("Ese usuario ya esta en uso.");

    if (errors.length > 0) {
      return res.render("Admin/Save", {
        editMode: false,
        formData,
        errors,
        layout: "admin-layout",
        "page-title": "Agregar Administrador"
      });
    }

    await Users.create({
      ...formData,
      password: hashPassword(password),
      role: Roles.ADMIN,
      isActive: true
    });

    req.flash("success", "Administrador creado correctamente.");
    return res.redirect("/Admin");
  } catch (error) {
    console.error("Error creando administrador:", error);
    return res.render("Admin/Save", {
      editMode: false,
      formData,
      errors: ["Ocurrio un error creando el administrador."],
      layout: "admin-layout",
      "page-title": "Agregar Administrador"
    });
  }
}
//#endregion

//#region EDIT
export async function getAdminEdit(req, res, next) {
  const id = req.params.id;
  const loggedUserId = getLoggedAdminId(req);

  try {
    if (loggedUserId && id === loggedUserId) {
      req.flash("error", "No puedes editar tu propio usuario.");
      return res.redirect("/Admin");
    }

    const admin = await Users.findOne({
      _id: id,
      role: Roles.ADMIN
    }).lean();

    if (!admin) {
      req.flash("error", "Administrador no encontrado.");
      return res.redirect("/Admin");
    }

    return res.render("Admin/Save", {
      editMode: true,
      admin,
      errors: [],
      layout: "admin-layout",
      "page-title": `Editar Administrador ${admin.name}`
    });
  } catch (error) {
    console.error("Error cargando administrador:", error);
    req.flash("error", "Error cargando el administrador.");
    return res.redirect("/Admin");
  }
}

export async function postAdminEdit(req, res, next) {
  const { id } = req.body;
  const loggedUserId = getLoggedAdminId(req);

  const formData = {
    name: sanitizeText(req.body.name),
    lastName: sanitizeText(req.body.lastName),
    username: sanitizeText(req.body.username),
    email: sanitizeText(req.body.email).toLowerCase(),
    cedula: sanitizeText(req.body.cedula),
    phone: sanitizeText(req.body.phone)
  };

  const password = typeof req.body.password === "string" ? req.body.password.trim() : "";
  const confirmPassword =
    typeof req.body.confirmPassword === "string" ? req.body.confirmPassword.trim() : "";

  const errors = [];

  if (!formData.name) errors.push("El nombre es obligatorio.");
  if (!formData.lastName) errors.push("El apellido es obligatorio.");
  if (!formData.username) errors.push("El usuario es obligatorio.");
  if (!formData.email) errors.push("El correo es obligatorio.");
  if (!formData.cedula) errors.push("La cedula es obligatoria.");
  if (!formData.phone) errors.push("El telefono es obligatorio.");
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push("El telefono solo debe contener numeros y tener entre 7 y 15 digitos.");
  }
  if (!password) errors.push("La contrasena es obligatoria.");
  if (!confirmPassword) errors.push("Debes confirmar la contrasena.");

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push("El correo no es valido.");
  }

  if (password && password.length < 8) {
    errors.push("La contrasena debe tener al menos 8 caracteres.");
  }

  if (password && confirmPassword && password !== confirmPassword) {
    errors.push("Las contrasenas no coinciden.");
  }

  try {
    if (loggedUserId && id === loggedUserId) {
      req.flash("error", "No puedes editar tu propio usuario.");
      return res.redirect("/Admin");
    }

    const admin = await Users.findOne({
      _id: id,
      role: Roles.ADMIN
    }).lean();

    if (!admin) {
      req.flash("error", "Administrador no encontrado.");
      return res.redirect("/Admin");
    }

    const [emailExists, usernameExists] = await Promise.all([
      Users.findOne({
        email: formData.email,
        _id: { $ne: id }
      }),
      Users.findOne({
        username: formData.username,
        _id: { $ne: id }
      })
    ]);

    if (emailExists) errors.push("Ya existe un usuario con ese correo.");
    if (usernameExists) errors.push("Ese usuario ya esta en uso.");

    if (errors.length > 0) {
      return res.render("Admin/Save", {
        editMode: true,
        admin: {
          _id: id,
          ...formData
        },
        errors,
        layout: "admin-layout",
        "page-title": "Editar Administrador"
      });
    }

    await Users.findByIdAndUpdate(id, {
      ...formData,
      password: hashPassword(password)
    });

    req.flash("success", "Administrador actualizado correctamente.");
    return res.redirect("/Admin");
  } catch (error) {
    console.error("Error actualizando administrador:", error);
    req.flash("error", "Error actualizando el administrador.");
    return res.redirect("/Admin");
  }
}
//#endregion

//#region STATUS
export async function postAdminStatus(req, res, next) {
  const adminId = req.params.id;

  try {
    const loggedUserId = getLoggedAdminId(req);

    if (loggedUserId && adminId === loggedUserId) {
      req.flash("error", "No puedes modificar tu propio estado.");
      return res.redirect("/Admin");
    }

    const admin = await Users.findOne({
      _id: adminId,
      role: Roles.ADMIN
    });

    if (!admin) {
      req.flash("error", "Administrador no encontrado.");
      return res.redirect("/Admin");
    }

    const newStatus = req.body.isActive === "true";
    admin.isActive = newStatus;
    await admin.save();

    req.flash(
      "success",
      newStatus
        ? "Administrador activado correctamente."
        : "Administrador desactivado correctamente."
    );

    return res.redirect("/Admin");
  } catch (error) {
    console.error("Error actualizando estado:", error);
    req.flash("error", "Error al actualizar el estado del administrador.");
    return res.redirect("/Admin");
  }
}
//#endregion
