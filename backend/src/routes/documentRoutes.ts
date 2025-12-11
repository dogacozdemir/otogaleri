import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { generateSalesContractPDF, generateInvoicePDF, getExpiringVehicleDocuments, getVehicleDocuments } from "../controllers/documentController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/sales-contract/:sale_id", generateSalesContractPDF);
router.get("/invoice/:sale_id", generateInvoicePDF);
router.get("/vehicles/expiring", getExpiringVehicleDocuments);
router.get("/vehicles/:vehicle_id", getVehicleDocuments);

export default router;
