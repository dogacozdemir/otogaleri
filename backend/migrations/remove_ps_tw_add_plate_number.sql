-- Migration: Remove ps_tw field and add plate_number to vehicles table
-- Run this SQL script to update the vehicles table

USE otogaleri;

-- Check if ps_tw column exists and drop it
SET @dbname = DATABASE();
SET @tablename = "vehicles";
SET @columnname = "ps_tw";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Add plate_number column if it doesn't exist
SET @columnname2 = "plate_number";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname2)
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname2, " VARCHAR(20) NULL AFTER chassis_no"),
  "SELECT 1"
));
PREPARE alterIfExists2 FROM @preparedStatement2;
EXECUTE alterIfExists2;
DEALLOCATE PREPARE alterIfExists2;

-- Add index for plate_number for better search performance (if it doesn't exist)
SET @indexname = "idx_tenant_plate_number";
SET @preparedStatement3 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) = 0,
  CONCAT("CREATE INDEX ", @indexname, " ON ", @tablename, "(tenant_id, plate_number)"),
  "SELECT 1"
));
PREPARE alterIfExists3 FROM @preparedStatement3;
EXECUTE alterIfExists3;
DEALLOCATE PREPARE alterIfExists3;
