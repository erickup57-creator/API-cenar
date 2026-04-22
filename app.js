import "./utils/LoadEnvConfig.js";
import express from "express";
import cors from "cors";
import path from "path";
import { projectRoot } from "./utils/Paths.js";
import connectDB from "./utils/MongooseConnection.js";
import { setupSwagger } from "./utils/swaggerConfig.js";

import authRoutes from "./routes/auth.routes.js";
import addressesRoutes from "./routes/addresses.routes.js";
import accountRoutes from "./routes/account.routes.js";
import commerceType from "./routes/commerceType.routes.js";
import configuration from "./routes/configuration.routes.js";
import adminDashboard from "./routes/AdminDashboard.routes.js";
import adminUsers from "./routes/adminUsers.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import productsRoutes from "./routes/products.routes.js";
import commerceCatalogRoutes from "./routes/commerceCatalog.routes.js";
import ordersRoutes from "./routes/orders.routes.js";



const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["*"],
    methods: process.env.CORS_METHODS
      ? process.env.CORS_METHODS.split(",")
      : ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS
      ? process.env.CORS_ALLOWED_HEADERS.split(",")
      : ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/Images", express.static(path.join(projectRoot, "public", "Images")));

// Swagger
setupSwagger(app);

app.get("/", (req, res) => {
  res.redirect(302, "/swagger/");
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api", commerceCatalogRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin/commerce-types", commerceType);
app.use("/api/configuration", configuration);
app.use("/api/admin/dashboard", adminDashboard);
app.use("/api/admin/users", adminUsers);

// Error handler global
app.use((error, req, res, next) => {
  if (!error) return next();
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const data = error.data || null;
  res.status(statusCode).json({ message, data });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "404 Not Found" });
});

try {
  await connectDB();
  app.listen(process.env.PORT || 3000);
  console.log(`API corriendo en el puerto ${process.env.PORT || 3000}`);
} catch (err) {
  console.error("Error iniciando la aplicación:", err);
}
