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
router.post("/:id/run", runCustomReport);

export default router;

