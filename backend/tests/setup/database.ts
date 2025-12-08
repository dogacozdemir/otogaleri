import mysql, { PoolConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_DB_NAME = process.env.OTG_DB_NAME_TEST || 'otogaleri_test';

// Create test-specific database pool
const testDbConfig = {
  host: process.env.OTG_DB_HOST || 'localhost',
  port: process.env.OTG_DB_PORT ? Number(process.env.OTG_DB_PORT) : 3306,
  user: process.env.OTG_DB_USER || 'root',
  password: process.env.OTG_DB_PASSWORD || '',
  multipleStatements: true,
};

export const testDbPool = mysql.createPool({
  ...testDbConfig,
  connectionLimit: 5,
});

/**
 * Test database setup - creates test database and runs schema
 */
export async function setupTestDatabase(): Promise<void> {
  const connection = await testDbPool.getConnection();
  
  try {
    // Create test database
    await (connection as any).query(`CREATE DATABASE IF NOT EXISTS ${TEST_DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
    
    // Read schema file
    const schemaPath = join(__dirname, '../../schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Remove comments (both single-line and multi-line)
    let cleanedSchema = schema
      .replace(/--[^\r\n]*/g, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Remove CREATE DATABASE and USE statements
    cleanedSchema = cleanedSchema
      .replace(/CREATE\s+DATABASE[^;]*;/gi, '')
      .replace(/USE\s+[^;]*;/gi, '');
    
    // Split by semicolons, but handle multi-line statements properly
    const statements: string[] = [];
    let currentStatement = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < cleanedSchema.length; i++) {
      const char = cleanedSchema[i];
      const nextChar = cleanedSchema[i + 1];
      
      // Handle quotes
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || cleanedSchema[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        currentStatement += char;
        continue;
      }
      
      // Handle semicolons (statement terminators)
      if (char === ';' && !inQuotes) {
        currentStatement = currentStatement.trim();
        if (currentStatement.length > 0) {
          statements.push(currentStatement);
        }
        currentStatement = '';
        continue;
      }
      
      currentStatement += char;
    }
    
    // Add last statement if exists
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Execute statements in order
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.length === 0) continue;
      
      try {
        await (connection as any).query(trimmed);
      } catch (err: any) {
        const errorMsg = err.message?.toLowerCase() || '';
        // Ignore expected errors
        if (!errorMsg.includes('already exists') && 
            !errorMsg.includes('duplicate') &&
            !errorMsg.includes('unknown database')) {
          // Log unexpected errors but don't fail
          console.warn(`Schema statement warning: ${err.message?.substring(0, 100)}`);
        }
      }
    }
    
    // Verify tenants table exists
    const [tables] = await (connection as any).query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'`,
      [TEST_DB_NAME]
    ) as [Array<{ count: number }>, any];
    
    if (!tables || tables.length === 0 || tables[0].count === 0) {
      throw new Error(`Failed to create tenants table in ${TEST_DB_NAME}. Schema setup may have failed.`);
    }
  } catch (err: any) {
    console.error('Database setup error:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Clean test database - truncates all tables
 */
export async function cleanTestDatabase(): Promise<void> {
  const connection = await testDbPool.getConnection();
  
  try {
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
    
    // Disable foreign key checks
    await (connection as any).query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await (connection as any).query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [TEST_DB_NAME]
    ) as [Array<{ TABLE_NAME: string }>, any];
    
    // Truncate all tables
    for (const table of tables) {
      await (connection as any).query(`TRUNCATE TABLE ${table.TABLE_NAME}`);
    }
    
    // Re-enable foreign key checks
    await (connection as any).query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
}

/**
 * Drop test database
 */
export async function teardownTestDatabase(): Promise<void> {
  const connection = await testDbPool.getConnection();
  
  try {
    await (connection as any).query(`USE ${TEST_DB_NAME}`);
  } catch (err) {
    // Database might not exist
  }
  
  try {
    await (connection as any).query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
  } finally {
    connection.release();
  }
}

/**
 * Get test database connection
 */
export async function getTestDbConnection() {
  const connection = await testDbPool.getConnection();
  await (connection as any).query(`USE ${TEST_DB_NAME}`);
  return connection;
}

// Cleanup test pool
export async function closeTestDbPool(): Promise<void> {
  await testDbPool.end();
}

