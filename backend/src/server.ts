import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { testConnection } from "./config/database";
import { generalLimiter } from "./middleware/rateLimiter";
import { corsConfig } from "./config/appConfig";
import authRoutes from "./routes/authRoutes";
import branchRoutes from "./routes/branchRoutes";
import staffRoutes from "./routes/staffRoutes";
import vehicleRoutes from "./routes/vehicleRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import fxAnalysisRoutes from "./routes/fxAnalysisRoutes";
import customerRoutes from "./routes/customerRoutes";
import accountingRoutes from "./routes/accountingRoutes";
import followupRoutes from "./routes/followupRoutes";
import documentRoutes from "./routes/documentRoutes";
import reportRoutes from "./routes/reportRoutes";
import searchRoutes from "./routes/searchRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import tenantRoutes from "./routes/tenantRoutes";
import installmentRoutes from "./routes/installmentRoutes";
import currencyRoutes from "./routes/currencyRoutes";
import quoteRoutes from "./routes/quoteRoutes";
import aclRoutes from "./routes/aclRoutes";
import path from "path";

const app = express();

// Trust proxy - required for express-rate-limit behind CloudPanel/Nginx
app.set('trust proxy', 1);

// CORS must be before helmet for static files
// Security: Only allow whitelisted origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = corsConfig.allowed;
    
    // In production, if no origins configured, deny all
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      console.warn('[CORS] No allowed origins configured in production. Denying request from:', origin);
      return callback(new Error('CORS: Origin not allowed'));
    }
    
    // Check if origin is allowed (supports wildcard patterns)
    if (corsConfig.isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked request from unauthorized origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-ID'],
}));

// Handle OPTIONS requests for static files (before helmet)
app.options("/uploads/*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

// Static file serving for uploads (must be before helmet)
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  setHeaders: (res, filePath) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}));

// Helmet configuration - enhanced security headers
app.use(helmet({
  // Allow static files and external resources
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"], // Allow inline scripts (for some frontend frameworks)
      "style-src": ["'self'", "'unsafe-inline'"], // Allow inline styles
      "img-src": ["'self'", "data:", "http:", "https:", "blob:"], // Allow images from various sources
      "font-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'"], // API connections
      "frame-ancestors": ["'none'"], // Prevent clickjacking
    },
  },
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" }, // Prevent clickjacking
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }, // Control referrer information
}));

// Cookie parser (for CSRF protection and session management)
app.use(cookieParser());

// CSRF Protection Middleware
// Note: Using Origin header validation + SameSite cookies instead of deprecated csurf
// This provides CSRF protection with less breaking changes
app.use((req, res, next) => {
  // Only protect state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF check for:
    // - Health checks
    // - Public endpoints (if any)
    // - File uploads (handled separately)
    if (req.path === '/health' || req.path.startsWith('/uploads/')) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // In production, validate Origin header
    if (process.env.NODE_ENV === 'production') {
      if (origin) {
        if (!corsConfig.isOriginAllowed(origin)) {
          console.warn('[CSRF] Blocked request from unauthorized origin:', origin);
          return res.status(403).json({ error: 'CSRF protection: Invalid origin' });
        }
      } else if (referer) {
        // Fallback to referer if origin is not present
        const refererOrigin = new URL(referer).origin;
        if (!corsConfig.isOriginAllowed(refererOrigin)) {
          console.warn('[CSRF] Blocked request from unauthorized referer:', refererOrigin);
          return res.status(403).json({ error: 'CSRF protection: Invalid referer' });
        }
      } else {
        // No origin or referer - suspicious for state-changing requests
        console.warn('[CSRF] Blocked state-changing request without origin/referer');
        return res.status(403).json({ error: 'CSRF protection: Missing origin header' });
      }
    }
    // Development: Log but allow (for testing with Postman, etc.)
    else if (origin && !corsConfig.isOriginAllowed(origin)) {
      console.warn('[CSRF] Development: Request from unauthorized origin:', origin);
    }
  }
  
  next();
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Limit URL-encoded payload size

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "otogaleri-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", fxAnalysisRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/installments", installmentRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/acl", aclRoutes);

// 404 Handler - Must be after all routes
import { notFoundHandler } from "./middleware/errorHandler";
app.use(notFoundHandler);

// Error Handler - Must be last middleware
import { errorHandler } from "./middleware/errorHandler";
app.use(errorHandler);

import { serverConfig } from "./config/appConfig";

const { port: PORT } = serverConfig.required;

async function start() {
  try {
    await testConnection();
    console.log("[otogaleri] Database connection OK");
  } catch (err) {
    console.error("[otogaleri] Database connection FAILED", err);
  }

  app.listen(PORT, () => {
    console.log(`Otogaleri backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("[otogaleri] Fatal startup error", err);
});

