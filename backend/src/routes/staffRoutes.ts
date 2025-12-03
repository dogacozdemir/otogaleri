import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { listStaff, createStaff, updateStaff, deleteStaff } from "../controllers/staffController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

router.get("/", listStaff);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

export default router;
