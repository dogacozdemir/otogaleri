import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { tenantQueryMiddleware } from "../middleware/tenantQuery";
import { paginationValidator } from "../middleware/paginationValidator";
import { validate, validateIdParam } from "../middleware/validation";
import { CreateStaffSchema, UpdateStaffSchema, StaffListQuerySchema } from "../validators/staffValidators";
import { requiresPermission } from "../services/roleService";
import { listStaff, createStaff, updateStaff, deleteStaff } from "../controllers/staffController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);
router.use(tenantQueryMiddleware); // Add tenantQuery middleware

router.get("/", 
  validate(StaffListQuerySchema.strict()),
  paginationValidator, 
  listStaff
);
router.post("/", 
  requiresPermission("STAFF_CREATE"),
  validate(CreateStaffSchema.strict()), 
  createStaff
);
router.put("/:id", 
  validateIdParam,
  requiresPermission("STAFF_UPDATE"),
  validate(UpdateStaffSchema.strict()), 
  updateStaff
);
router.delete("/:id", 
  validateIdParam,
  requiresPermission("STAFF_DELETE"), 
  deleteStaff
);

export default router;
