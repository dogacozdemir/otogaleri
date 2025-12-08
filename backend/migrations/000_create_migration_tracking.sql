-- Migration: Create migration tracking table
-- This table tracks which migrations have been executed
-- This migration should be run FIRST before any other migrations

USE otogaleri;

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

SELECT 'Migration tracking table created successfully' as message;

