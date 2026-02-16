-- Quote module enhancements: discount, settings, versioning
-- 1. Add discount to vehicle_quotes
-- 2. Create quote_settings for gallery branding
-- 3. last_modified_at for PDF versioning (updated_at already exists)

USE otogaleri;

-- Add discount_amount to vehicle_quotes (fixed amount in quote currency)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_quotes' AND COLUMN_NAME = 'discount_amount');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE vehicle_quotes ADD COLUMN discount_amount DECIMAL(12,2) NULL DEFAULT NULL AFTER sale_price', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Quote settings per tenant (gallery branding for PDF)
CREATE TABLE IF NOT EXISTS quote_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL UNIQUE,
  gallery_logo_url TEXT NULL,
  terms_conditions TEXT NULL,
  contact_phone VARCHAR(50) NULL,
  contact_whatsapp VARCHAR(50) NULL,
  contact_address TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id)
);
