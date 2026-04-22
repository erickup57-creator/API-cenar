import { Router } from "express";
import {
  getCreateCategory,
  getCategories,
  getDashboard,
  getDeleteCategory,
  getDeleteProduct,
  getEditCategory,
  getEditProduct,
  getOrderDetail,
  getCreateProduct,
  getProducts,
  postAssignDelivery,
  postCreateCategory,
  postCreateProduct,
  postDeleteCategory,
  postDeleteProduct,
  postEditCategory,
  postEditProduct,
  getProfile,
  postProfile
} from "../controllers/commerce.controller.js";
import { Roles } from "../utils/enums/roles.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { uploadProductImage, uploadProfileImage } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(requireAuth, requireRole(Roles.COMMERCE));

router.get("/", getDashboard);
router.get("/dashboard", getDashboard);
router.get("/dashboard/index", getDashboard);
router.get("/profile", getProfile);
router.post("/profile", uploadProfileImage, postProfile);
router.get("/categories", getCategories);
router.get("/categories/new", getCreateCategory);
router.post("/categories/new", postCreateCategory);
router.get("/categories/:categoryId/edit", getEditCategory);
router.post("/categories/:categoryId/edit", postEditCategory);
router.get("/categories/:categoryId/delete", getDeleteCategory);
router.post("/categories/:categoryId/delete", postDeleteCategory);
router.get("/products", getProducts);
router.get("/products/new", getCreateProduct);
router.post("/products/new", uploadProductImage, postCreateProduct);
router.get("/products/:productId/edit", getEditProduct);
router.post("/products/:productId/edit", uploadProductImage, postEditProduct);
router.get("/products/:productId/delete", getDeleteProduct);
router.post("/products/:productId/delete", postDeleteProduct);
router.get("/orders/:orderId", getOrderDetail);
router.post("/orders/:orderId/assign-delivery", postAssignDelivery);

export default router;
