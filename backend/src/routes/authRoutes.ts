import { Router } from "express";
import { signup, login, changePassword } from "../controllers/authController";
import { loginLimiter, signupLimiter } from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = Router();

// Apply different rate limiting to login and signup
router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);

// Password change requires authentication
router.post("/change-password", authMiddleware, tenantGuard, changePassword);

export default router;
