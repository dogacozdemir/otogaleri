import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { getFxImpactAnalysis } from "../controllers/fxAnalysisController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/vehicles/:vehicle_id/fx-impact", getFxImpactAnalysis);

export default router;
