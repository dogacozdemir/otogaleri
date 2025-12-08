import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// Note: testConnection is not used in test app, removed to avoid import issues
import authRoutes from '../../src/routes/authRoutes';
import branchRoutes from '../../src/routes/branchRoutes';
import staffRoutes from '../../src/routes/staffRoutes';
import vehicleRoutes from '../../src/routes/vehicleRoutes';
import analyticsRoutes from '../../src/routes/analyticsRoutes';
import fxAnalysisRoutes from '../../src/routes/fxAnalysisRoutes';
import customerRoutes from '../../src/routes/customerRoutes';
import accountingRoutes from '../../src/routes/accountingRoutes';
import followupRoutes from '../../src/routes/followupRoutes';
import documentRoutes from '../../src/routes/documentRoutes';
import reportRoutes from '../../src/routes/reportRoutes';
import searchRoutes from '../../src/routes/searchRoutes';
import inventoryRoutes from '../../src/routes/inventoryRoutes';
import tenantRoutes from '../../src/routes/tenantRoutes';
import installmentRoutes from '../../src/routes/installmentRoutes';
import currencyRoutes from '../../src/routes/currencyRoutes';

/**
 * Create test Express app instance
 */
export function createTestApp(): express.Application {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(helmet({
    crossOriginResourcePolicy: false,
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

  return app;
}

