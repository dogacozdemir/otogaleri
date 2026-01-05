import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import * as mysql from "mysql2/promise";

const {
  OTG_DB_HOST,
  OTG_DB_PORT,
  OTG_DB_USER,
  OTG_DB_PASSWORD,
  OTG_DB_NAME,
} = process.env;

if (!OTG_DB_HOST || !OTG_DB_USER || !OTG_DB_NAME) {
  console.error("[migration] Database env variables are not fully set.");
  process.exit(1);
}

import { dbConfig as appDbConfig } from "../config/appConfig";

const dbConfigValues = appDbConfig.required;

const dbConfig = {
  host: dbConfigValues.host,
  port: dbConfigValues.port,
  user: dbConfigValues.user,
  password: dbConfigValues.password,
  database: dbConfigValues.database,
  multipleStatements: true, // Allow multiple SQL statements
};

interface MigrationRecord {
  migration_name: string;
  executed_at: Date;
  success: boolean;
}

async function ensureMigrationTable(conn: mysql.Connection): Promise<void> {
  // Check if migration tracking table exists
  const [tables] = await conn.query(
    "SHOW TABLES LIKE 'schema_migrations'"
  );
  
  if ((tables as any[]).length === 0) {
    // Create migration tracking table
    const migrationTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INT NULL,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT NULL,
        INDEX idx_migration_name (migration_name),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await conn.query(migrationTableSQL);
    console.log("[migration] Migration tracking table created");
  }
}

async function getExecutedMigrations(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT migration_name FROM schema_migrations WHERE success = TRUE"
  );
  return new Set(rows.map((row) => row.migration_name));
}

async function recordMigration(
  conn: mysql.Connection,
  migrationName: string,
  success: boolean,
  executionTimeMs: number,
  errorMessage?: string
): Promise<void> {
  await conn.query(
    `INSERT INTO schema_migrations (migration_name, execution_time_ms, success, error_message)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       executed_at = CURRENT_TIMESTAMP,
       execution_time_ms = VALUES(execution_time_ms),
       success = VALUES(success),
       error_message = VALUES(error_message)`,
    [migrationName, executionTimeMs, success, errorMessage || null]
  );
}

async function runMigration(
  conn: mysql.Connection,
  migrationName: string,
  sql: string
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    // Remove USE statement if present (we already have database selected)
    const cleanedSQL = sql.replace(/USE\s+\w+;?\s*/gi, "");
    
    // Split by semicolon and filter empty statements
    const statements = cleanedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    
    for (const statement of statements) {
      if (statement.length > 0) {
        await conn.query(statement);
      }
    }
    
    const executionTime = Date.now() - startTime;
    await recordMigration(conn, migrationName, true, executionTime);
    
    console.log(`[migration] ✓ ${migrationName} (${executionTime}ms)`);
    return true;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    await recordMigration(conn, migrationName, false, executionTime, errorMessage);
    
    console.error(`[migration] ✗ ${migrationName} failed:`, errorMessage);
    return false;
  }
}

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    console.log("[migration] Starting migration process...");
    
    // Ensure migration tracking table exists
    await ensureMigrationTable(conn);
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(conn);
    console.log(`[migration] Found ${executedMigrations.size} executed migrations`);
    
    // Read migration files
    const migrationsDir = join(__dirname, "../../migrations");
    const files = await readdir(migrationsDir);
    
    // Filter and sort migration files (numeric prefix for ordering)
    const migrationFiles = files
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => {
        // Extract numeric prefix if exists
        const aNum = parseInt(a.match(/^(\d+)_/)?.[1] || "999999");
        const bNum = parseInt(b.match(/^(\d+)_/)?.[1] || "999999");
        return aNum - bNum;
      });
    
    console.log(`[migration] Found ${migrationFiles.length} migration files`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    for (const file of migrationFiles) {
      const migrationName = file.replace(".sql", "");
      
      if (executedMigrations.has(migrationName)) {
        console.log(`[migration] - ${migrationName} (already executed, skipping)`);
        skipCount++;
        continue;
      }
      
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, "utf-8");
      
      const success = await runMigration(conn, migrationName, sql);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
        // Stop on first failure (optional - remove if you want to continue)
        console.error(`[migration] Stopping due to migration failure`);
        break;
      }
    }
    
    console.log("\n[migration] Migration summary:");
    console.log(`  ✓ Executed: ${successCount}`);
    console.log(`  - Skipped: ${skipCount}`);
    console.log(`  ✗ Failed: ${failCount}`);
    
    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("[migration] Fatal error:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();

