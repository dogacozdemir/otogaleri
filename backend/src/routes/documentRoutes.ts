import express from "express";
import multer from "multer";
import {
  listVehicleDocuments,
  uploadVehicleDocument,
  deleteVehicleDocument,
  getExpiringVehicleDocuments,
  listCustomerDocuments,
  uploadCustomerDocument,
  verifyCustomerDocument,
  deleteCustomerDocument,
  upload,
} from "../controllers/documentController";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = express.Router();

// Tüm route'lar auth ve tenant guard gerektirir
router.use(authMiddleware);
router.use(tenantGuard);

// Multer error handler middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Dosya boyutu 10MB'dan büyük olamaz" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Araç belgeleri
router.get("/vehicles/:vehicle_id", listVehicleDocuments);
router.post("/vehicles/:vehicle_id", upload.single("file"), handleMulterError, uploadVehicleDocument);
router.delete("/vehicles/:id", deleteVehicleDocument);
router.get("/vehicles/expiring", getExpiringVehicleDocuments);

// Müşteri belgeleri
router.get("/customers/:customer_id", listCustomerDocuments);
router.post("/customers/:customer_id", upload.single("file"), handleMulterError, uploadCustomerDocument);
router.put("/customers/:id/verify", verifyCustomerDocument);
router.delete("/customers/:id", deleteCustomerDocument);

export default router;

