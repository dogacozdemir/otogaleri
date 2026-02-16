-- Add weight (Ağırlık) column to vehicles table
-- Weight in kg (e.g. 1500 for 1500 kg)
-- Idempotent: safe to run multiple times (skips if column exists)

DROP PROCEDURE IF EXISTS add_vehicle_weight_column;
DELIMITER //
CREATE PROCEDURE add_vehicle_weight_column()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'weight') = 0 THEN
    ALTER TABLE vehicles ADD COLUMN weight INT NULL AFTER cc;
  END IF;
END //
DELIMITER ;
CALL add_vehicle_weight_column();
DROP PROCEDURE add_vehicle_weight_column;
