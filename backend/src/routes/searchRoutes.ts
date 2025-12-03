import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenantGuard";
import {
  globalSearch,
  getSearchSuggestions,
  getRecentSearches
} from "../controllers/searchController";

const router = Router();

router.use(authMiddleware);
router.use(tenantGuard);

// Global search
router.get("/", globalSearch);

// Search suggestions (autocomplete)
router.get("/suggestions", getSearchSuggestions);

// Recent searches
router.get("/recent", getRecentSearches);

export default router;

