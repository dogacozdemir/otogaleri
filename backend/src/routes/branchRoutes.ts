import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { listBranches, createBranch, updateBranch, deleteBranch } from "../controllers/branchController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/", listBranches);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

export default router;
