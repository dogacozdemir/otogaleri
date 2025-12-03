import express from "express";
import {
  listFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  getTodayFollowups,
  listFollowupTemplates,
  createFollowupTemplate,
} from "../controllers/followupController";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";

const router = express.Router();

// Tüm route'lar auth ve tenant guard gerektirir
router.use(authMiddleware);
router.use(tenantGuard);

// Takip işlemleri
router.get("/", listFollowups);
router.get("/today", getTodayFollowups);
router.get("/templates", listFollowupTemplates);
router.post("/templates", createFollowupTemplate);
router.get("/:id", getFollowupById);
router.post("/", createFollowup);
router.put("/:id", updateFollowup);
router.delete("/:id", deleteFollowup);

export default router;

