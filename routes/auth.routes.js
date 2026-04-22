import { Router } from "express";
import {
  activateAccount,
  logout,
  login,
  register,
  renderLoginPage,
  renderRegisterPage,
  renderForgotPasswordPage,  
  forgotPassword,
  renderResetPasswordPage,  
  resetPassword          
} from "../controllers/auth.controller.js";
import {
  registerCommerce,
  renderRegisterCommercePage
} from "../controllers/auth.controller.register.js";
import { requireGuest } from "../middlewares/auth.middleware.js";

import { uploadProfileImage } from "../middlewares/upload.middleware.js";

const authRouter = Router();

authRouter.get("/login", requireGuest, renderLoginPage);
authRouter.post("/login", requireGuest, login);
authRouter.get("/register", requireGuest, renderRegisterPage);
authRouter.get("/activate/:token", activateAccount);
authRouter.get("/register-commerce", requireGuest, renderRegisterCommercePage);
authRouter.post("/register", requireGuest, uploadProfileImage, register);
authRouter.post("/register-commerce", requireGuest, uploadProfileImage, registerCommerce);
authRouter.post("/logout", logout);
authRouter.get("/forgot-password", requireGuest, renderForgotPasswordPage);
authRouter.post("/forgot-password", requireGuest, forgotPassword);
authRouter.get("/reset-password/:token", requireGuest, renderResetPasswordPage);
authRouter.post("/reset-password", requireGuest, resetPassword);


export default authRouter;
