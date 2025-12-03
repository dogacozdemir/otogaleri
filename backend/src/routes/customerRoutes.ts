import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSegments,
} from "../controllers/customerController";
import {
  getCustomSegments,
  createCustomSegment,
  deleteCustomSegment,
} from "../controllers/crmController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

// Customer CRUD
router.get("/", listCustomers);
router.post("/", createCustomer);
router.get("/segments", getCustomerSegments);
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

// CRM segments
router.get("/crm/segments", getCustomSegments);
router.post("/crm/segments", createCustomSegment);
router.delete("/crm/segments/:id", deleteCustomSegment);

export default router;

