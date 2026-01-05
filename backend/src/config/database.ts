import * as mysql from "mysql2/promise";
import { dbConfig, dbSslConfig, dbPoolConfig } from "./appConfig";
import fs from "fs";

/**
 * Database Connection Pool
 * NO hard-coded values - all from appConfig
 */
const dbConfigValues = dbConfig.required;
const poolConfigValues = dbPoolConfig.config;

// Build SSL configuration
let sslConfig: any = false;
if (process.env.NODE_ENV === 'production') {
  // Production: SSL is STRONGLY RECOMMENDED (warning if not configured)
  if (dbSslConfig.caPath && fs.existsSync(dbSslConfig.caPath)) {
    sslConfig = {
      rejectUnauthorized: dbSslConfig.rejectUnauthorized,
      ca: fs.readFileSync(dbSslConfig.caPath),
    };
    console.log("[database] SSL enabled with CA certificate");
  } else if (dbSslConfig.enabled) {
    // SSL enabled but no CA file - use default SSL (less secure)
    sslConfig = {
      rejectUnauthorized: dbSslConfig.rejectUnauthorized,
    };
    console.warn(
      "[database] WARNING: SSL enabled without CA certificate. " +
      "For maximum security, set DB_SSL_CA=/path/to/ca-cert.pem"
    );
  } else {
    // Production without SSL - CRITICAL WARNING
    console.error(
      "[database] ⚠️  CRITICAL WARNING: Production environment detected but SSL not configured! " +
      "Database connection is NOT encrypted. " +
      "Set DB_SSL_ENABLED=true and DB_SSL_CA=/path/to/ca-cert.pem"
    );
    // In production, we allow connection but strongly warn
    // Uncomment the following line to BLOCK non-SSL connections in production:
    // throw new Error("CRITICAL: SSL is required for production database connections");
  }
} else if (dbSslConfig.enabled && dbSslConfig.caPath && fs.existsSync(dbSslConfig.caPath)) {
  // Development: Optional SSL
  sslConfig = {
    rejectUnauthorized: dbSslConfig.rejectUnauthorized,
    ca: fs.readFileSync(dbSslConfig.caPath),
  };
  console.log("[database] SSL enabled (development mode)");
}

export const dbPool = mysql.createPool({
  host: dbConfigValues.host,
  port: dbConfigValues.port,
  user: dbConfigValues.user,
  password: dbConfigValues.password,
  database: dbConfigValues.database,
  ssl: sslConfig,
  ...poolConfigValues,
});

export async function testConnection() {
  const conn = await dbPool.getConnection();
  await conn.ping();
  conn.release();
}
