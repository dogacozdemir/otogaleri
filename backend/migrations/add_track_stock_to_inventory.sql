-- Migration: Add track_stock field to inventory_products table
-- This field determines if stock tracking should be done for the product
-- If false, stock won't increase/decrease but financial records will still be kept

USE otogaleri;

-- Add track_stock column (default TRUE for existing products)
ALTER TABLE inventory_products 
ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT TRUE AFTER is_for_service;

-- Add index for better query performance
CREATE INDEX idx_tenant_track_stock ON inventory_products(tenant_id, track_stock);
