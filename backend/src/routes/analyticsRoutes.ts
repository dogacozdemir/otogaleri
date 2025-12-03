import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  getBrandProfit,
  getModelProfit,
  getSalesDuration,
  getTopProfitable,
  getMonthlyComparison,
  getCategoryCosts,
} from "../controllers/analyticsController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/brand-profit", getBrandProfit);
router.get("/model-profit", getModelProfit);
router.get("/sales-duration", getSalesDuration);
router.get("/top-profitable", getTopProfitable);
router.get("/monthly-comparison", getMonthlyComparison);
router.get("/category-costs", getCategoryCosts);

export default router;
