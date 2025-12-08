-- Migration: Add unique index for vehicle_number
-- This ensures each vehicle number is unique within a tenant

USE otogaleri;

-- Check if index exists, if not create it
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicles' 
    AND index_name = 'idx_tenant_vehicle_number'
);

SET @sql = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX idx_tenant_vehicle_number ON vehicles(tenant_id, vehicle_number)',
  'SELECT ''Index already exists'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing vehicles with sequential numbers per tenant if they don't have numbers
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

SELECT 'vehicle_number index and data updated successfully' as message;

