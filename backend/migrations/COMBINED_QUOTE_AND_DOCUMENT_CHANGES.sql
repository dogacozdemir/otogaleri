-- =============================================================================
-- Bu geliştirmelerde yapılan tüm veritabanı değişiklikleri
-- (Quote Management, Eksper/Grade belge türleri, vb.)
-- =============================================================================

USE otogaleri;

-- -----------------------------------------------------------------------------
-- 1. QUOTE MODÜLÜ GELİŞTİRMELERİ
-- -----------------------------------------------------------------------------

-- 1.1 vehicle_quotes tablosuna discount_amount sütunu ekle
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_quotes' AND COLUMN_NAME = 'discount_amount');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE vehicle_quotes ADD COLUMN discount_amount DECIMAL(12,2) NULL DEFAULT NULL AFTER sale_price', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 quote_settings tablosu (gallery branding, şartlar, iletişim bilgileri)
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

-- -----------------------------------------------------------------------------
-- 2. ARAÇ BELGELERİ - EKSPER VE GRADE TÜRLERİ
-- -----------------------------------------------------------------------------

-- 2.1 vehicle_documents tablosuna eksper ve grade belge türlerini ekle
ALTER TABLE vehicle_documents
  MODIFY COLUMN document_type ENUM(
    'contract', 'registration', 'insurance', 'inspection',
    'customs', 'invoice', 'eksper', 'grade', 'other'
  ) NOT NULL;
