import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  listVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController";
import {
  listVehicleCosts,
  addVehicleCost,
  updateVehicleCost,
  deleteVehicleCost,
} from "../controllers/vehicleCostController";
import { markVehicleAsSold } from "../controllers/vehicleSaleController";
import { calculateVehicleProfit } from "../controllers/profitController";
import { listVehicleImages, uploadVehicleImage, deleteVehicleImage, setPrimaryImage, upload } from "../controllers/vehicleImageController";
import {
  getBrandProfit,
  getModelProfit,
  getSalesDuration,
  getTopProfitable,
  getMonthlyComparison,
  getCategoryCosts,
} from "../controllers/analyticsController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

// Analytics routes (must come before parameterized routes)
router.get("/analytics/brand-profit", getBrandProfit);
router.get("/analytics/model-profit", getModelProfit);
router.get("/analytics/sales-duration", getSalesDuration);
router.get("/analytics/top-profitable", getTopProfitable);
router.get("/analytics/monthly-comparison", getMonthlyComparison);
router.get("/analytics/category-costs", getCategoryCosts);

router.get("/", listVehicles);
router.post("/", createVehicle);

// Vehicle sub-routes (must come before /:id route)
router.get("/:id/costs", listVehicleCosts);
router.post("/:id/costs", addVehicleCost);
router.put("/:id/costs/:cost_id", updateVehicleCost);
router.delete("/:id/costs/:cost_id", deleteVehicleCost);
router.get("/:id/calculate-costs", calculateVehicleProfit);
router.get("/:id/profit", calculateVehicleProfit);
router.post("/:id/sell", markVehicleAsSold);
router.get("/:id/images", listVehicleImages);
router.post("/:id/images", upload.single("image"), uploadVehicleImage);
router.put("/:id/images/:image_id/primary", setPrimaryImage);
router.delete("/:id/images/:image_id", deleteVehicleImage);

// Vehicle CRUD routes (must come after sub-routes)
router.get("/:id", getVehicleById);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
