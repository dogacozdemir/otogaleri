-- Migration: Add settings fields to tenants table
-- Run this SQL script to add phone, address, city, and language fields

USE otogaleri;

-- Add new fields to tenants table
ALTER TABLE tenants 
ADD COLUMN phone VARCHAR(50) NULL AFTER country,
ADD COLUMN address TEXT NULL AFTER phone,
ADD COLUMN city VARCHAR(100) NULL AFTER address,
ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'tr' AFTER city;

-- Add index for language
CREATE INDEX idx_tenant_language ON tenants(language);
