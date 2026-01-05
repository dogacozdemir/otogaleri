import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { tenantQueryMiddleware } from "../middleware/tenantQuery";
import { paginationValidator } from "../middleware/paginationValidator";
import { validate, validateIdParam } from "../middleware/validation";
import { CreateBranchSchema, UpdateBranchSchema, BranchListQuerySchema } from "../validators/branchValidators";
import { requiresPermission } from "../services/roleService";
import { listBranches, createBranch, updateBranch, deleteBranch } from "../controllers/branchController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);
router.use(tenantQueryMiddleware); // Add tenantQuery middleware

router.get("/", 
  validate(BranchListQuerySchema.strict()),
  paginationValidator, 
  listBranches
);
router.post("/", 
  requiresPermission("BRANCH_CREATE"),
  validate(CreateBranchSchema.strict()), 
  createBranch
);
router.put("/:id", 
  validateIdParam,
  requiresPermission("BRANCH_UPDATE"),
  validate(UpdateBranchSchema.strict()), 
  updateBranch
);
router.delete("/:id", 
  validateIdParam,
  requiresPermission("BRANCH_DELETE"), 
  deleteBranch
);

export default router;
