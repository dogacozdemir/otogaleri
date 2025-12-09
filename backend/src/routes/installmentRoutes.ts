import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  createInstallmentSale,
  recordPayment,
  updatePayment,
  deletePayment,
  getInstallmentDetails,
  getInstallmentByVehicleId,
  getRemainingBalance,
  getOverdueInstallments,
  getActiveInstallments,
  getTopOverdueInstallments,
  sendReminder,
} from "../controllers/installmentController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.post("/", createInstallmentSale);
router.post("/payments", recordPayment);
router.put("/payments/:payment_id", updatePayment);
router.delete("/payments/:payment_id", deletePayment);
router.get("/overdue", getOverdueInstallments);
router.get("/overdue/top", getTopOverdueInstallments);
router.get("/active", getActiveInstallments);
router.post("/:installment_sale_id/send-reminder", sendReminder);
router.get("/:id", getInstallmentDetails);
router.get("/vehicle/:vehicle_id", getInstallmentByVehicleId);
router.get("/:id/balance", getRemainingBalance);

export default router;
