import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { paginationValidator } from "../middleware/paginationValidator";
import { inputSanitizer } from "../middleware/inputSanitizer";
import {
  listQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  convertQuoteToSale,
} from "../controllers/quoteController";
import { getQuoteSettings, updateQuoteSettings } from "../controllers/quoteSettingsController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);
router.use(inputSanitizer);

router.get("/", paginationValidator, listQuotes);
router.get("/settings", getQuoteSettings);
router.put("/settings", updateQuoteSettings);
router.post("/", createQuote);
router.get("/:id", getQuoteById);
router.put("/:id", updateQuote);
router.delete("/:id", deleteQuote);
router.post("/:id/convert-to-sale", convertQuoteToSale);

export default router;

