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
  getActiveInstallmentCount,
  getMonthlySales,
  getOldStock,
  getRecentActivities,
  getWeeklySales,
  getWeeklyInventory,
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
router.get("/active-installment-count", getActiveInstallmentCount);
router.get("/monthly-sales", getMonthlySales);
router.get("/weekly-sales", getWeeklySales);
router.get("/weekly-inventory", getWeeklyInventory);
router.get("/old-stock", getOldStock);
router.get("/recent-activities", getRecentActivities);

export default router;
