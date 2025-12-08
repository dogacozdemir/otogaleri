-- Migration: Add vehicle_number column to vehicles table
-- This migration adds a vehicle_number field that is auto-incremented per tenant
-- and can be manually edited by users

USE otogaleri;

-- Add vehicle_number column
ALTER TABLE vehicles 
ADD COLUMN vehicle_number INT NULL AFTER tenant_id;

-- Create unique index for tenant_id + vehicle_number combination
-- This ensures each vehicle number is unique within a tenant
CREATE UNIQUE INDEX idx_tenant_vehicle_number ON vehicles(tenant_id, vehicle_number);

-- Update existing vehicles with sequential numbers per tenant
-- This assigns numbers 1, 2, 3... to existing vehicles based on their creation order
-- Using a temporary table to avoid MySQL update restriction
CREATE TEMPORARY TABLE temp_vehicle_numbers AS
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

DROP TEMPORARY TABLE temp_vehicle_numbers;

SELECT 'vehicle_number column added successfully to vehicles table' as message;

