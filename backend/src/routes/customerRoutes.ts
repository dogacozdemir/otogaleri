import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { tenantQueryMiddleware } from "../middleware/tenantQuery";
import { paginationValidator } from "../middleware/paginationValidator";
import { inputSanitizer } from "../middleware/inputSanitizer";
import { validate, validateIdParam } from "../middleware/validation";
import { CreateCustomerSchema, UpdateCustomerSchema, CustomerListQuerySchema } from "../validators/customerValidators";
import { requiresPermission } from "../services/roleService";
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
router.use(tenantQueryMiddleware); // Add tenantQuery middleware
router.use(inputSanitizer);

// Customer CRUD
router.get("/", 
  validate(CustomerListQuerySchema.strict()), 
  paginationValidator, 
  listCustomers
);
router.post("/", 
  requiresPermission("CUSTOMER_CREATE"),
  validate(CreateCustomerSchema.strict()), 
  createCustomer
);
router.get("/segments", getCustomerSegments);
router.get("/:id", 
  validateIdParam, 
  getCustomerById
);
router.put("/:id", 
  validateIdParam,
  requiresPermission("CUSTOMER_UPDATE"),
  validate(UpdateCustomerSchema.strict()), 
  updateCustomer
);
router.delete("/:id", 
  validateIdParam,
  requiresPermission("CUSTOMER_DELETE"), 
  deleteCustomer
);

// CRM segments
router.get("/crm/segments", getCustomSegments);
router.post("/crm/segments", createCustomSegment);
router.delete("/crm/segments/:id", deleteCustomSegment);

export default router;

