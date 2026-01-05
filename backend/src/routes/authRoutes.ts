import { Router } from "express";
import { signup, login, changePassword } from "../controllers/authController";
import { authLimiter } from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = Router();

// Apply strict rate limiting to authentication endpoints
router.use(authLimiter);

router.post("/signup", signup);
router.post("/login", login);

// Password change requires authentication
router.post("/change-password", authMiddleware, tenantGuard, changePassword);

export default router;
