import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { uploadLimiter } from "../middleware/rateLimiter";
import {
  generateSalesContractPDF,
  generateInvoicePDF,
  getExpiringVehicleDocuments,
  getVehicleDocuments,
  uploadVehicleDocument,
  deleteVehicleDocument,
  getCustomerDocuments,
  uploadCustomerDocument,
  deleteCustomerDocument,
  documentUpload,
} from "../controllers/documentController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/sales-contract/:sale_id", generateSalesContractPDF);
router.get("/invoice/:sale_id", generateInvoicePDF);
router.get("/vehicles/expiring", getExpiringVehicleDocuments);
router.get("/vehicles/:vehicle_id", getVehicleDocuments);
router.post("/vehicles/:vehicle_id", uploadLimiter, documentUpload.single("file"), uploadVehicleDocument);
router.delete("/vehicles/:document_id", deleteVehicleDocument);

router.get("/customers/:customer_id", getCustomerDocuments);
router.post("/customers/:customer_id", uploadLimiter, documentUpload.single("file"), uploadCustomerDocument);
router.delete("/customers/:document_id", deleteCustomerDocument);

export default router;
