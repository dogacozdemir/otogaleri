-- Migration: Add reminder tracking to installment sales
-- Run this SQL script to add last_reminder_sent field for tracking reminder history

USE otogaleri;

-- Add last_reminder_sent field to vehicle_installment_sales
ALTER TABLE vehicle_installment_sales 
ADD COLUMN IF NOT EXISTS last_reminder_sent DATE NULL,
ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0;

-- Add index for efficient querying of overdue installments
CREATE INDEX IF NOT EXISTS idx_overdue_installments ON vehicle_installment_sales(tenant_id, status, sale_date);

