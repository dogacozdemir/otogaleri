import express from "express";
import { getCurrencyRate } from "../controllers/currencyController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/rate", authMiddleware, getCurrencyRate);

export default router;
