-- Add custom_rate column to vehicle_costs table for manual FX rate entry
-- This allows users to override the automatic FX rate from the API

-- Check if column exists before adding
SET @dbname = DATABASE();
SET @tablename = 'vehicle_costs';
SET @columnname = 'custom_rate';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(18,8) NULL COMMENT ''Manually entered FX rate (overrides API rate)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;


