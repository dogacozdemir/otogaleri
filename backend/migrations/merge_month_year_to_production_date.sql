-- Migration: Merge month and year columns into production_year
-- This migration combines the month and year fields into a single production_year INT field
-- and removes the old month and year columns

USE otogaleri;

-- Add production_year column
ALTER TABLE vehicles 
ADD COLUMN production_year INT NULL AFTER model;

-- Migrate existing data: use year if available, otherwise NULL
UPDATE vehicles
SET production_year = year
WHERE production_year IS NULL;

-- Remove the old month and year columns
ALTER TABLE vehicles DROP COLUMN month;
ALTER TABLE vehicles DROP COLUMN year;

SELECT 'month and year columns merged into production_year successfully' as message;

