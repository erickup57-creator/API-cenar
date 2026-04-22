import "../utils/LoadEnvConfig.js";
import mongoose from "mongoose";
import connectDB from "../utils/MongooseConnection.js";
import Orders from "../models/OrderModel.js";
import Users from "../models/UserModel.js";
import Commerce from "../models/CommerceModel.js";
import Delivery from "../models/DeliveryModel.js";
import Addresses from "../models/AddressModel.js";
import Config from "../models/ConfigModel.js";
import { Roles } from "../utils/enums/roles.js";

const TEST_TAG = "[TEST-ORDER]";

function buildProducts(index) {
  return [
    {
      productId: new mongoose.Types.ObjectId(),
      name: `${TEST_TAG} Combo ${index + 1}A`,
      price: 320 + index * 15,
      image: null
    },
    {
      productId: new mongoose.Types.ObjectId(),
      name: `${TEST_TAG} Combo ${index + 1}B`,
      price: 180 + index * 10,
      image: null
    }
  ];
}

function calculateTotals(products, itbisRate) {
  const subtotal = products.reduce((acc, product) => acc + Number(product.price || 0), 0);
  const itbis = subtotal * (Number(itbisRate || 18) / 100);
  const total = subtotal + itbis;
  return { subtotal, itbis, total };
}

async function getBaseEntities() {
  const client =
    (await Users.findOne({ role: Roles.CLIENT, isActive: true }).lean()) ||
    (await Users.findOne({ role: Roles.CLIENT }).lean());

  const commerce =
    (await Commerce.findOne({ isActive: true }).lean()) ||
    (await Commerce.findOne().lean());

  const delivery =
    (await Delivery.findOne({ isActive: true }).sort({ createdAt: -1 })) ||
    (await Delivery.findOne().sort({ createdAt: -1 }));

  if (!client) throw new Error("No hay clientes en la coleccion Users.");
  if (!commerce) throw new Error("No hay comercios en la coleccion Commerces.");
  if (!delivery) throw new Error("No hay deliveries en la coleccion Deliveries.");

  return { client, commerce, delivery };
}

async function getOrCreateAddress(clientId) {
  const existingAddress = await Addresses.findOne({ userId: clientId }).lean();
  if (existingAddress) return existingAddress;

  return await Addresses.create({
    name: "Casa principal",
    description: "Direccion creada automaticamente para pedidos de prueba",
    userId: clientId
  });
}

async function seedTestOrders() {
  await connectDB();

  const config = await Config.findOne().lean();
  const itbis = Number(config?.itbis ?? 18);
  const { client, commerce, delivery } = await getBaseEntities();
  const address = await getOrCreateAddress(client._id);

  await Orders.deleteMany({
    commerceId: commerce._id,
    clientId: client._id,
    "products.name": { $regex: /^\[TEST-ORDER\]/ }
  });

  const statuses = ["pendiente", "en proceso", "completado"];
  const now = Date.now();

  const docs = statuses.map((status, index) => {
    const products = buildProducts(index);
    const totals = calculateTotals(products, itbis);

    const orderDoc = {
      clientId: client._id,
      commerceId: commerce._id,
      addressId: address._id,
      products,
      subtotal: totals.subtotal,
      itbis: totals.itbis,
      total: totals.total,
      status,
      createdAt: new Date(now - (2 - index) * 60 * 60 * 1000),
      updatedAt: new Date(now - (2 - index) * 60 * 60 * 1000)
    };

    if (status !== "pendiente") {
      orderDoc.deliveryId = delivery._id;
    }

    return orderDoc;
  });

  const inserted = await Orders.insertMany(docs);

  const hasInProcessOrder = await Orders.exists({
    deliveryId: delivery._id,
    status: "en proceso"
  });

  delivery.deliveryStatus = hasInProcessOrder ? "ocupado" : "disponible";
  if (!delivery.isActive) {
    delivery.isActive = true;
  }
  await delivery.save();

  console.log(`Pedidos creados: ${inserted.length}`);
  inserted.forEach((order, index) => {
    console.log(
      `#${index + 1} ${String(order._id)} | estado=${order.status} | total=${order.total.toFixed(2)}`
    );
  });
}

try {
  await seedTestOrders();
} catch (error) {
  console.error("Error creando pedidos de prueba:", error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
