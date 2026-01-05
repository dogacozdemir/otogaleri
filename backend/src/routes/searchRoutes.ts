import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import { searchLimiter } from "../middleware/rateLimiter";
import {
  globalSearch,
  getSearchSuggestions,
  getRecentSearches
} from "../controllers/searchController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);
// Apply search rate limiting
router.use(searchLimiter);

// Global search
router.get("/", globalSearch);

// Search suggestions (autocomplete)
router.get("/suggestions", getSearchSuggestions);

// Recent searches
router.get("/recent", getRecentSearches);

export default router;

