-- Migration: Merge month and year columns into production_year
-- This migration combines the month and year fields into a single production_year INT field
-- and removes the old month and year columns (idempotent - skips if columns don't exist)

SET @dbname = DATABASE();

-- Add production_year column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'production_year');
SET @sql_add = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN production_year INT NULL AFTER model',
  'SELECT 1');
PREPARE stmt_add FROM @sql_add;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;

-- Migrate existing data: use year if available (only if year column exists)
SET @year_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'year');
SET @sql_migrate = IF(@year_exists > 0,
  'UPDATE vehicles SET production_year = year WHERE production_year IS NULL',
  'SELECT 1');
PREPARE stmt_migrate FROM @sql_migrate;
EXECUTE stmt_migrate;
DEALLOCATE PREPARE stmt_migrate;

-- Remove month column if exists
SET @month_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'month');
SET @sql_drop_m = IF(@month_exists > 0, 'ALTER TABLE vehicles DROP COLUMN month', 'SELECT 1');
PREPARE stmt_drop_m FROM @sql_drop_m;
EXECUTE stmt_drop_m;
DEALLOCATE PREPARE stmt_drop_m;

-- Remove year column if exists
SET @year_exists2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'year');
SET @sql_drop_y = IF(@year_exists2 > 0, 'ALTER TABLE vehicles DROP COLUMN year', 'SELECT 1');
PREPARE stmt_drop_y FROM @sql_drop_y;
EXECUTE stmt_drop_y;
DEALLOCATE PREPARE stmt_drop_y;

