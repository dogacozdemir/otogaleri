import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  createInstallmentSale,
  recordPayment,
  getInstallmentDetails,
  getInstallmentByVehicleId,
  getRemainingBalance,
  getOverdueInstallments,
  getActiveInstallments,
} from "../controllers/installmentController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.post("/", createInstallmentSale);
router.post("/payments", recordPayment);
router.get("/overdue", getOverdueInstallments);
router.get("/active", getActiveInstallments);
router.get("/:id", getInstallmentDetails);
router.get("/vehicle/:vehicle_id", getInstallmentByVehicleId);
router.get("/:id/balance", getRemainingBalance);

export default router;
