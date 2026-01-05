import express from "express";
import {
  listCustomReports,
  getCustomReportById,
  createCustomReport,
  updateCustomReport,
  deleteCustomReport,
  runCustomReport,
  getReportRuns,
} from "../controllers/reportController";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { reportLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Tüm route'lar auth ve tenant guard gerektirir
router.use(authMiddleware);
router.use(tenantGuard);

// Rapor işlemleri
router.get("/", listCustomReports);
router.get("/runs", getReportRuns);
router.get("/:id", getCustomReportById);
router.post("/", createCustomReport);
router.put("/:id", updateCustomReport);
router.delete("/:id", deleteCustomReport);
// Apply report rate limiting only for expensive report generation
router.post("/:id/run", reportLimiter, runCustomReport);

export default router;

