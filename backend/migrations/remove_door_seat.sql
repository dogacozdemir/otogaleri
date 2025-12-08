-- Migration: Remove door_seat column from vehicles table
-- This migration removes the door_seat (Kapı/Koltuk) field from the vehicles table

USE otogaleri;

-- Remove the door_seat column from vehicles table
-- Check if column exists before dropping (MySQL doesn't support IF EXISTS for DROP COLUMN)
SET @dbname = DATABASE();
SET @tablename = "vehicles";
SET @columnname = "door_seat";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 'Column does not exist'"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SELECT 'door_seat column removed successfully from vehicles table' as message;

