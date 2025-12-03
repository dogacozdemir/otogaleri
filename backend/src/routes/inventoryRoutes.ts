import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  handleEntry,
  handleExit,
  listMovements,
  getAnalytics,
} from "../controllers/inventoryController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/", listProducts);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Stok hareketi (giriş/çıkış)
router.post("/:id/entry", handleEntry);
router.post("/:id/exit", handleExit);

// Hareket geçmişi
router.get("/:id/movements", listMovements);

// Analytics
router.get("/analytics/overview", getAnalytics);

export default router;
