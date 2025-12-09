-- Migration: Add vehicle_number column to vehicles table
-- This migration adds a vehicle_number field that is auto-incremented per tenant
-- and can be manually edited by users

USE otogaleri;

-- Check if vehicle_number column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicles' 
    AND column_name = 'vehicle_number'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN vehicle_number INT NULL AFTER tenant_id',
  'SELECT ''Column vehicle_number already exists'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if index exists, if not create it
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicles' 
    AND index_name = 'idx_tenant_vehicle_number'
);

SET @sql2 = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX idx_tenant_vehicle_number ON vehicles(tenant_id, vehicle_number)',
  'SELECT ''Index idx_tenant_vehicle_number already exists'' as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Update existing vehicles with sequential numbers per tenant
-- This assigns numbers 1, 2, 3... to existing vehicles based on their creation order
-- Using a temporary table to avoid MySQL update restriction
-- Only update if there are vehicles without vehicle_number
SET @vehicles_without_number = (
  SELECT COUNT(*) 
  FROM vehicles 
  WHERE vehicle_number IS NULL
);

SET @sql3 = IF(@vehicles_without_number > 0,
  CONCAT('
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_vehicle_numbers AS
    SELECT 
      v1.id,
      v1.tenant_id,
      (SELECT COUNT(*) + 1
       FROM vehicles v2
       WHERE v2.tenant_id = v1.tenant_id 
         AND v2.id < v1.id) as new_number
    FROM vehicles v1
    WHERE v1.vehicle_number IS NULL;
    
    UPDATE vehicles v
    INNER JOIN temp_vehicle_numbers t ON v.id = t.id
    SET v.vehicle_number = t.new_number
    WHERE v.vehicle_number IS NULL;
    
    DROP TEMPORARY TABLE IF EXISTS temp_vehicle_numbers;
  '),
  'SELECT ''All vehicles already have vehicle_number'' as message'
);

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SELECT 'vehicle_number column migration completed successfully' as message;

