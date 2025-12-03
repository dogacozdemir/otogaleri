import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { getTenant, updateTenant } from "../controllers/tenantController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/", getTenant);
router.put("/", updateTenant);

export default router;
