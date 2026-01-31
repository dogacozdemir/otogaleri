-- Add engine_no (Motor No) column to vehicles table
-- Position: after color, before other (Renk ile Diğer arasında)

ALTER TABLE vehicles
  ADD COLUMN engine_no VARCHAR(100) NULL AFTER color;
