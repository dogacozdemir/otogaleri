import { Router } from "express";
import {
  signup,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import {
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
router.post("/change-password", authMiddleware, tenantGuard, changePassword);

export default router;
