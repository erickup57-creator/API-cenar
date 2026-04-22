import "../utils/LoadEnvConfig.js";
import mongoose from "mongoose";
import { randomBytes, scryptSync } from "crypto";

import connectDB from "../utils/MongooseConnection.js";
import Users from "../models/UserModel.js";

const defaultAdmin = {
  name: "Admin",
  lastName: "System",
  username: "admin",
  email: "admin@appcenar.com",
  phone: "809-000-0000",
  cedula: "00000000001",
  role: "admin",
  isActive: true
};

async function seedAdmin() {
  await connectDB();

  const existingAdmin = await Users.findOne({
    role: "admin",
    email: defaultAdmin.email
  });

  if (existingAdmin) {
    console.log(`El administrador ya existe: ${defaultAdmin.email}`);
    return;
  }

  const salt = randomBytes(16).toString("hex");
  const hashedPassword = scryptSync("Admin123456", salt, 64).toString("hex");

  await Users.create({
    ...defaultAdmin,
    password: `${salt}:${hashedPassword}`
  });

  console.log(`Administrador creado: ${defaultAdmin.email}`);
}

try {
  await seedAdmin();
} catch (error) {
  console.error("Error al sembrar administrador:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}