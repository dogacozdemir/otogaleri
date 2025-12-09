import { Router, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { AuthRequest } from "../middleware/auth";
import {
  getPermissions,
  getPermissionsByRole,
  upsertPermission,
  deletePermission,
  bulkUpdatePermissions,
  initializeDefaultPermissions,
} from "../controllers/aclController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

// Only managers, admins, and owners can manage ACL
const aclGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userRole) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Owners and admins have full access
  if (req.userRole === "owner" || req.userRole === "admin" || req.userRole === "manager") {
    return next();
  }

  return res.status(403).json({ error: "Permission denied. Only managers and above can manage ACL." });
};

router.use(aclGuard);

router.get("/", getPermissions);
router.get("/role/:role", getPermissionsByRole);
router.post("/", upsertPermission);
router.post("/bulk", bulkUpdatePermissions);
router.post("/initialize", initializeDefaultPermissions);
router.delete("/:id", deletePermission);

export default router;

