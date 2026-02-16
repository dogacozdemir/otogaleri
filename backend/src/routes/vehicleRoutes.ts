import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { paginationValidator } from "../middleware/paginationValidator";
import { inputSanitizer } from "../middleware/inputSanitizer";
import {
  listVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getNextVehicleNumber,
  lookupByChassis,
  validateCreateVehicle,
  validateUpdateVehicle,
  validateVehicleId,
} from "../controllers/vehicleController";
import {
  listVehicleCosts,
  addVehicleCost,
  updateVehicleCost,
  deleteVehicleCost,
} from "../controllers/vehicleCostController";
import { markVehicleAsSold } from "../controllers/vehicleSaleController";
import { calculateVehicleProfit, convertCostsToCurrency } from "../controllers/profitController";
import { reSyncVehicleCostFxRates } from "../controllers/fxResyncController";
import { listVehicleImages, uploadVehicleImage, deleteVehicleImage, setPrimaryImage, updateImageOrder, upload } from "../controllers/vehicleImageController";
import { bulkImportVehicles, bulkImportCosts, upload as bulkUpload } from "../controllers/bulkImportController";
import { uploadLimiter } from "../middleware/rateLimiter";
import {
  getBrandProfit,
  getModelProfit,
  getSalesDuration,
  getTopProfitable,
  getMonthlyComparison,
  getCategoryCosts,
} from "../controllers/analyticsController";
import { requiresPermission } from "../services/roleService";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);
router.use(inputSanitizer);

// Analytics routes (must come before parameterized routes)
router.get("/analytics/brand-profit", getBrandProfit);
router.get("/analytics/model-profit", getModelProfit);
router.get("/analytics/sales-duration", getSalesDuration);
router.get("/analytics/top-profitable", getTopProfitable);
router.get("/analytics/monthly-comparison", getMonthlyComparison);
router.get("/analytics/category-costs", getCategoryCosts);

router.get("/", paginationValidator, listVehicles);
router.get("/lookup-by-chassis", lookupByChassis);
router.get("/next-number", getNextVehicleNumber);
router.post("/", validateCreateVehicle, createVehicle);
// Apply upload rate limiting to bulk imports
router.post("/bulk-import", uploadLimiter, bulkUpload.single("file"), bulkImportVehicles);
router.post("/bulk-costs", uploadLimiter, bulkUpload.single("file"), bulkImportCosts);

// Vehicle sub-routes (must come before /:id route)
router.get("/:id/costs", listVehicleCosts);
router.post("/:id/costs", addVehicleCost);
router.put("/:id/costs/:cost_id", updateVehicleCost);
router.delete("/:id/costs/:cost_id", deleteVehicleCost);
router.get("/:id/calculate-costs", calculateVehicleProfit);
router.get("/:id/profit", calculateVehicleProfit);
router.post("/:id/convert-costs", convertCostsToCurrency);
router.post("/:id/resync-fx-rates", reSyncVehicleCostFxRates);
router.post("/:id/sell", markVehicleAsSold);
router.get("/:id/images", listVehicleImages);
// Apply upload rate limiting to image uploads
router.post("/:id/images", uploadLimiter, upload.single("image"), uploadVehicleImage);
// Order must be before :image_id route so PUT /:id/images/order is not matched as image_id=order
router.put("/:id/images/order", updateImageOrder);
router.put("/:id/images/:image_id/primary", setPrimaryImage);
router.delete("/:id/images/:image_id", deleteVehicleImage);

// Vehicle CRUD routes (must come after sub-routes)
router.get("/:id", validateVehicleId, getVehicleById);
router.put("/:id", validateVehicleId, validateUpdateVehicle, updateVehicle);
// Only admin and owner can delete vehicles
router.delete("/:id", validateVehicleId, requiresPermission("VEHICLE_DELETE"), deleteVehicle);

export default router;
