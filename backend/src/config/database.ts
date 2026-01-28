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
// SSL is now fully controlled by DB_SSL_ENABLED env variable
// If DB_SSL_ENABLED=false, SSL will not be used even in production
let sslConfig: any = false;

if (dbSslConfig.enabled) {
  // SSL is enabled via DB_SSL_ENABLED=true
  if (dbSslConfig.caPath && fs.existsSync(dbSslConfig.caPath)) {
    sslConfig = {
      rejectUnauthorized: dbSslConfig.rejectUnauthorized,
      ca: fs.readFileSync(dbSslConfig.caPath),
    };
    console.log("[database] SSL enabled with CA certificate");
  } else {
    // SSL enabled but no CA file - use default SSL (less secure)
    sslConfig = {
      rejectUnauthorized: dbSslConfig.rejectUnauthorized,
    };
    console.warn(
      "[database] WARNING: SSL enabled without CA certificate. " +
      "For maximum security, set DB_SSL_CA=/path/to/ca-cert.pem"
    );
  }
} else {
  // SSL is disabled via DB_SSL_ENABLED=false
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      "[database] INFO: SSL is disabled (DB_SSL_ENABLED=false). " +
      "Database connection will not use SSL encryption."
    );
  }
  sslConfig = false;
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
