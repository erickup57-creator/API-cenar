import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { projectRoot } from "./Paths.js";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "ApiCenar",
    version: "1.0.0",
    description: "API RESTful para gestión de pedidos de comida"
  },
  servers: [
    {
      url: process.env.APP_URL || "http://localhost:8000"
    }
  ],
  tags: [
    {
      name: "Auth",
      description: "Autenticacion y recuperacion de cuenta"
    },
    {
      name: "Addresses",
      description: "Direcciones del cliente autenticado"
    },
    {
      name: "Favorites",
      description: "Comercios favoritos del cliente autenticado"
    },
    {
      name: "Categories",
      description: "Categorias del comercio autenticado"
    },
    {
      name: "Products",
      description: "Productos del comercio autenticado"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [path.join(projectRoot, "routes/*.js"),
         path.join(projectRoot, "routes/**/*.js")]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export function setupSwagger(app) {
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
