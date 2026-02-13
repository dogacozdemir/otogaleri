import express from "express";
import { authMiddleware } from "../middleware/auth";
import { getJaponKiymetCache, loadJaponKiymetCache } from "../services/japonKiymetService";

const router = express.Router();

router.get("/master", authMiddleware, (req, res) => {
  try {
    const data = getJaponKiymetCache() ?? loadJaponKiymetCache();
    res.json(data);
  } catch (err: any) {
    console.error("[japon-kiymet] Error serving master data:", err);
    res.status(500).json({ error: "Failed to load japon kiymet data" });
  }
});

export default router;
