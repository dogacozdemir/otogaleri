-- Migration: Add arrival_date column to vehicles table
-- This migration adds an arrival_date field to track when the vehicle arrived at the dealer

USE otogaleri;

-- Add arrival_date column
ALTER TABLE vehicles 
ADD COLUMN arrival_date DATE NULL AFTER production_year;

SELECT 'arrival_date column added successfully to vehicles table' as message;

