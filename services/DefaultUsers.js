import { randomBytes, scryptSync } from "node:crypto";
import Users from "../models/UserModel.js";
import { Roles } from "../utils/enums/roles.js";

function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function createDefaultAdmin() {
  try {
    const exists = await Users.findOne({
      $or: [{ email: "admin@gmail.com" }, { username: "superadmin" }],
    });

    if (exists) {
      console.log("Admin por defecto ya existe, omitiendo creación.");
      return;
    }

    await Users.create({
      name: "Super",
      lastName: "Admin",
      username: "superadmin",
      email: "admin@gmail.com",
      phone: "809-000-0000",
      cedula: "000-0000000-0",
      password: hashPassword("admin123"),
      role: Roles.ADMIN,
      isActive: true,
      activateToken: null,
      resetToken: null,
      resetTokenExpiration: null,
    });

    console.log("Admin por defecto creado: admin@gmail.com / admin123");
  } catch (err) {
    console.error("Error creando admin por defecto:", err.message ?? err);
  }
}