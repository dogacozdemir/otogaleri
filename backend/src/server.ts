import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./config/database";
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

// CORS must be before helmet for static files
app.use(cors({
  origin: true,
  credentials: true,
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

// Helmet configuration - allow static files (after static serving)
app.use(helmet({
  crossOriginResourcePolicy: false, // Disable for static files
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", "data:", "http:", "https:"],
    },
  },
}));

app.use(express.json());

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

const PORT = process.env.PORT || 5005;

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
