-- ============================================
-- TÜM MİGRATİON'LARI TEK SEFERDE ÇALIŞTIR
-- ============================================
-- Bu script tüm gerekli migration'ları içerir ve idempotent'tir (tekrar çalıştırılabilir)
-- MySQL'e girin ve tüm komutları kopyala-yapıştır yapın

USE otogaleri;

-- ============================================
-- 1. VEHICLE_QUOTES TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  customer_id INT NULL,
  quote_number VARCHAR(50) NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL DEFAULT 1,
  down_payment DECIMAL(12,2) NULL,
  installment_count INT NULL,
  installment_amount DECIMAL(12,2) NULL,
  status ENUM('draft','sent','approved','rejected','expired','converted') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_quote_number (tenant_id, quote_number),
  UNIQUE KEY uniq_tenant_quote_number (tenant_id, quote_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. ACL_PERMISSIONS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS acl_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  role ENUM('owner', 'manager', 'sales', 'accounting', 'other') NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_resource_action (tenant_id, role, resource, action),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_role (tenant_id, role),
  INDEX idx_resource_action (resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. INSTALLMENT REMINDER TRACKING
-- ============================================
-- last_reminder_sent kolonu
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicle_installment_sales' 
    AND column_name = 'last_reminder_sent'
);

SET @sql_reminder = IF(@col_exists = 0,
  'ALTER TABLE vehicle_installment_sales ADD COLUMN last_reminder_sent TIMESTAMP NULL DEFAULT NULL',
  'SELECT ''Column last_reminder_sent already exists'' as message'
);

PREPARE stmt_reminder FROM @sql_reminder;
EXECUTE stmt_reminder;
DEALLOCATE PREPARE stmt_reminder;

-- reminder_count kolonu
SET @col_exists2 = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicle_installment_sales' 
    AND column_name = 'reminder_count'
);

SET @sql_reminder2 = IF(@col_exists2 = 0,
  'ALTER TABLE vehicle_installment_sales ADD COLUMN reminder_count INT NOT NULL DEFAULT 0',
  'SELECT ''Column reminder_count already exists'' as message'
);

PREPARE stmt_reminder2 FROM @sql_reminder2;
EXECUTE stmt_reminder2;
DEALLOCATE PREPARE stmt_reminder2;

-- Index
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicle_installment_sales' 
    AND index_name = 'idx_overdue_installments'
);

SET @sql_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_overdue_installments ON vehicle_installment_sales(tenant_id, status, sale_date)',
  'SELECT ''Index idx_overdue_installments already exists'' as message'
);

PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- ============================================
-- 4. VEHICLE_NUMBER KOLONU VE INDEX
-- ============================================
-- vehicle_number kolonu
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicles' 
    AND column_name = 'vehicle_number'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN vehicle_number INT NULL AFTER tenant_id',
  'SELECT ''Column vehicle_number already exists'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = 'otogaleri' 
    AND table_name = 'vehicles' 
    AND index_name = 'idx_tenant_vehicle_number'
);

SET @sql2 = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX idx_tenant_vehicle_number ON vehicles(tenant_id, vehicle_number)',
  'SELECT ''Index idx_tenant_vehicle_number already exists'' as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Mevcut araçlara numara atama
CREATE TEMPORARY TABLE IF NOT EXISTS temp_vehicle_numbers_update AS
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
INNER JOIN temp_vehicle_numbers_update t ON v.id = t.id
SET v.vehicle_number = t.new_number
WHERE v.vehicle_number IS NULL;

DROP TEMPORARY TABLE IF EXISTS temp_vehicle_numbers_update;

-- ============================================
-- TAMAMLANDI
-- ============================================
SELECT 'Tüm migration''lar başarıyla tamamlandı!' as message;

