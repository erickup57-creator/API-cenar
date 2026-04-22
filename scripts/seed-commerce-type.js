import "../utils/LoadEnvConfig.js";
import mongoose from "mongoose";
import connectDB from "../utils/MongooseConnection.js";
import CommerceType from "../models/CommerceTypeModel.js";

const defaultType = {
  name: "Restaurante",
  description: "Comercio dedicado a la venta de comida preparada.",
  icon: "bi bi-shop"
};

async function seedCommerceType() {
  await connectDB();

  const result = await CommerceType.updateOne(
    { name: defaultType.name },
    { $setOnInsert: defaultType },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log(`Tipo de comercio creado: ${defaultType.name}`);
  } else {
    console.log(`El tipo de comercio ya existe: ${defaultType.name}`);
  }
}

try {
  await seedCommerceType();
} catch (error) {
  console.error("Error al sembrar tipo de comercio:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
