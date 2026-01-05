-- ============================================
-- PRODUCTION DATABASE UPDATE SCRIPT
-- ============================================
-- Bu dosya production veritabanını güncellemek için hazırlanmıştır
-- Tüm migration'ları tek seferde çalıştırmak için kullanılır
-- Idempotent'tir (tekrar çalıştırılabilir)
-- 
-- KULLANIM:
-- 1. MySQL'e bağlanın: mysql -u username -p otogaleri
-- 2. Bu dosyanın içeriğini kopyalayıp yapıştırın
-- 3. Veya: mysql -u username -p otogaleri < PRODUCTION_DATABASE_UPDATE.sql
-- ============================================

USE otogaleri;

-- ============================================
-- 1. MIGRATION TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT NULL,
  INDEX idx_migration_name (migration_name),
  INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TOKEN VERSION (Password change invalidation)
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'token_version'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0',
  'SELECT "Column token_version already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_users_token_version'
);

SET @sql2 = IF(@idx_exists = 0,
  'CREATE INDEX idx_users_token_version ON users(tenant_id, id, token_version)',
  'SELECT "Index idx_users_token_version already exists" as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================
-- 3. VEHICLE IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  image_path TEXT NOT NULL,
  image_filename VARCHAR(255) NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_tenant_vehicle (tenant_id, vehicle_id),
  INDEX idx_primary (vehicle_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. ARRIVAL DATE COLUMN
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles' 
    AND COLUMN_NAME = 'arrival_date'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN arrival_date DATE NULL AFTER production_year',
  'SELECT "Column arrival_date already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. INSTALLMENT SALES TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_installment_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  sale_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  down_payment DECIMAL(12,2) NOT NULL,
  installment_count INT NOT NULL,
  installment_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL,
  sale_date DATE NOT NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES vehicle_sales(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_sale (sale_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_installment_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  installment_sale_id INT NOT NULL,
  payment_type ENUM('down_payment', 'installment') NOT NULL,
  installment_number INT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (installment_sale_id) REFERENCES vehicle_installment_sales(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_installment_sale (installment_sale_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. FOLLOWUP AND DOCUMENTS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS post_sale_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sale_id INT NOT NULL,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  followup_type ENUM('call', 'sms', 'email', 'visit', 'other') NOT NULL DEFAULT 'call',
  followup_date DATE NOT NULL,
  followup_time TIME NULL,
  status ENUM('pending', 'completed', 'cancelled', 'rescheduled') DEFAULT 'pending',
  notes TEXT NULL,
  satisfaction_score INT NULL,
  feedback TEXT NULL,
  next_followup_date DATE NULL,
  created_by INT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES vehicle_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_followup_date (followup_date),
  INDEX idx_sale (sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS followup_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  days_after_sale INT NOT NULL,
  followup_type ENUM('call', 'sms', 'email') NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  document_type ENUM('contract', 'registration', 'insurance', 'inspection', 'customs', 'invoice', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE NULL,
  notes TEXT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_vehicle_type (vehicle_id, document_type),
  INDEX idx_expiry (expiry_date),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  document_type ENUM('id_card', 'driving_license', 'passport', 'address_proof', 'bank_statement', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE NULL,
  notes TEXT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_customer_type (customer_id, document_type),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  report_type ENUM('sales', 'profit', 'inventory', 'customer', 'staff', 'financial', 'custom') NOT NULL,
  query_config JSON NOT NULL,
  format ENUM('pdf', 'excel', 'csv', 'html') DEFAULT 'pdf',
  schedule_type ENUM('once', 'daily', 'weekly', 'monthly') NULL,
  schedule_config JSON NULL,
  recipients JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NULL,
  last_run_at TIMESTAMP NULL,
  next_run_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  file_path TEXT NULL,
  error_message TEXT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES custom_reports(id) ON DELETE CASCADE,
  INDEX idx_report_status (report_id, status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. TENANT SETTINGS (phone, address, city, language)
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenants' 
    AND COLUMN_NAME = 'phone'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenants ADD COLUMN phone VARCHAR(50) NULL AFTER country, ADD COLUMN address TEXT NULL AFTER phone, ADD COLUMN city VARCHAR(100) NULL AFTER address, ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT ''tr'' AFTER city',
  'SELECT "Tenant settings columns already exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenants' 
    AND INDEX_NAME = 'idx_tenant_language'
);

SET @sql2 = IF(@idx_exists = 0,
  'CREATE INDEX idx_tenant_language ON tenants(language)',
  'SELECT "Index idx_tenant_language already exists" as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================
-- 8. INVENTORY TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sku VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'adet',
  current_stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NULL,
  sale_price DECIMAL(12,2) NULL,
  sales_count INT NOT NULL DEFAULT 0,
  is_for_sale BOOLEAN NOT NULL DEFAULT FALSE,
  is_for_service BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_tenant_sku (tenant_id, sku),
  INDEX idx_tenant_category (tenant_id, category),
  UNIQUE KEY uniq_tenant_sku (tenant_id, sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  type ENUM('in', 'out', 'sale', 'service_usage', 'correction') NOT NULL,
  quantity INT NOT NULL,
  cost_price DECIMAL(12,2) NULL,
  sale_price DECIMAL(12,2) NULL,
  customer_id INT NULL,
  staff_id INT NULL,
  note TEXT NULL,
  movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_product (product_id),
  INDEX idx_movement_date (movement_date),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  customer_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  staff_id INT NULL,
  note TEXT NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_product (product_id),
  INDEX idx_customer (customer_id),
  INDEX idx_sale_date (sale_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. TRACK STOCK COLUMN
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inventory_products' 
    AND COLUMN_NAME = 'track_stock'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE inventory_products ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT TRUE AFTER is_for_service',
  'SELECT "Column track_stock already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'inventory_products' 
    AND INDEX_NAME = 'idx_tenant_track_stock'
);

SET @sql2 = IF(@idx_exists = 0,
  'CREATE INDEX idx_tenant_track_stock ON inventory_products(tenant_id, track_stock)',
  'SELECT "Index idx_tenant_track_stock already exists" as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================
-- 10. MERGE MONTH/YEAR TO PRODUCTION_YEAR
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles' 
    AND COLUMN_NAME = 'production_year'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN production_year INT NULL AFTER model',
  'SELECT "Column production_year already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate existing data if month/year columns exist
SET @col_month_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles' 
    AND COLUMN_NAME = 'year'
);

SET @sql_migrate = IF(@col_month_exists > 0,
  'UPDATE vehicles SET production_year = year WHERE production_year IS NULL AND year IS NOT NULL',
  'SELECT "No year column to migrate" as message'
);

PREPARE stmt_migrate FROM @sql_migrate;
EXECUTE stmt_migrate;
DEALLOCATE PREPARE stmt_migrate;

-- Remove old columns if they exist
SET @col_month_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles' 
    AND COLUMN_NAME = 'month'
);

SET @sql_drop_month = IF(@col_month_exists > 0,
  'ALTER TABLE vehicles DROP COLUMN month',
  'SELECT "Column month does not exist" as message'
);

PREPARE stmt_drop_month FROM @sql_drop_month;
EXECUTE stmt_drop_month;
DEALLOCATE PREPARE stmt_drop_month;

SET @col_year_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles' 
    AND COLUMN_NAME = 'year'
);

SET @sql_drop_year = IF(@col_year_exists > 0,
  'ALTER TABLE vehicles DROP COLUMN year',
  'SELECT "Column year does not exist" as message'
);

PREPARE stmt_drop_year FROM @sql_drop_year;
EXECUTE stmt_drop_year;
DEALLOCATE PREPARE stmt_drop_year;

-- ============================================
-- 11. REMOVE DOOR_SEAT COLUMN
-- ============================================
SET @dbname = DATABASE();
SET @tablename = "vehicles";
SET @columnname = "door_seat";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 'Column door_seat does not exist'"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- ============================================
-- 12. REMOVE PS_TW, ADD PLATE_NUMBER
-- ============================================
SET @dbname = DATABASE();
SET @tablename = "vehicles";
SET @columnname = "ps_tw";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  CONCAT("ALTER TABLE ", @tablename, " DROP COLUMN ", @columnname),
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname2 = "plate_number";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname2)
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname2, " VARCHAR(20) NULL AFTER chassis_no"),
  "SELECT 1"
));
PREPARE alterIfExists2 FROM @preparedStatement2;
EXECUTE alterIfExists2;
DEALLOCATE PREPARE alterIfExists2;

SET @indexname = "idx_tenant_plate_number";
SET @preparedStatement3 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) = 0,
  CONCAT("CREATE INDEX ", @indexname, " ON ", @tablename, "(tenant_id, plate_number)"),
  "SELECT 1"
));
PREPARE alterIfExists3 FROM @preparedStatement3;
EXECUTE alterIfExists3;
DEALLOCATE PREPARE alterIfExists3;

-- ============================================
-- 13. VEHICLE NUMBER COLUMN AND INDEX
-- ============================================
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = DATABASE() 
    AND table_name = 'vehicles' 
    AND column_name = 'vehicle_number'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN vehicle_number INT NULL AFTER tenant_id',
  'SELECT "Column vehicle_number already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = DATABASE() 
    AND table_name = 'vehicles' 
    AND index_name = 'idx_tenant_vehicle_number'
);

SET @sql2 = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX idx_tenant_vehicle_number ON vehicles(tenant_id, vehicle_number)',
  'SELECT "Index idx_tenant_vehicle_number already exists" as message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Update existing vehicles with sequential numbers per tenant
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
-- 14. VEHICLE QUOTES TABLE
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
-- 15. ACL PERMISSIONS TABLE
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
-- 16. INSTALLMENT REMINDER TRACKING
-- ============================================
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = DATABASE() 
    AND table_name = 'vehicle_installment_sales' 
    AND column_name = 'last_reminder_sent'
);

SET @sql_reminder = IF(@col_exists = 0,
  'ALTER TABLE vehicle_installment_sales ADD COLUMN last_reminder_sent TIMESTAMP NULL DEFAULT NULL',
  'SELECT "Column last_reminder_sent already exists" as message'
);

PREPARE stmt_reminder FROM @sql_reminder;
EXECUTE stmt_reminder;
DEALLOCATE PREPARE stmt_reminder;

SET @col_exists2 = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE table_schema = DATABASE() 
    AND table_name = 'vehicle_installment_sales' 
    AND column_name = 'reminder_count'
);

SET @sql_reminder2 = IF(@col_exists2 = 0,
  'ALTER TABLE vehicle_installment_sales ADD COLUMN reminder_count INT NOT NULL DEFAULT 0',
  'SELECT "Column reminder_count already exists" as message'
);

PREPARE stmt_reminder2 FROM @sql_reminder2;
EXECUTE stmt_reminder2;
DEALLOCATE PREPARE stmt_reminder2;

SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE table_schema = DATABASE() 
    AND table_name = 'vehicle_installment_sales' 
    AND index_name = 'idx_overdue_installments'
);

SET @sql_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_overdue_installments ON vehicle_installment_sales(tenant_id, status, sale_date)',
  'SELECT "Index idx_overdue_installments already exists" as message'
);

PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- ============================================
-- 17. INVENTORY CURRENCY SUPPORT
-- ============================================
SET @dbname = DATABASE();
SET @tablename = 'inventory_products';

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'cost_currency')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_currency VARCHAR(3) NULL DEFAULT ''TRY''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'cost_fx_rate_to_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_fx_rate_to_base DECIMAL(18,8) NULL DEFAULT 1.0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'sale_currency')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_currency VARCHAR(3) NULL DEFAULT ''TRY''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'sale_fx_rate_to_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_fx_rate_to_base DECIMAL(18,8) NULL DEFAULT 1.0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename = 'inventory_movements';

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'cost_currency')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_currency VARCHAR(3) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'cost_fx_rate_to_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_fx_rate_to_base DECIMAL(18,8) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'sale_currency')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_currency VARCHAR(3) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'sale_fx_rate_to_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_fx_rate_to_base DECIMAL(18,8) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'cost_amount_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_amount_base DECIMAL(14,2) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = 'sale_amount_base')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_amount_base DECIMAL(14,2) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing records to have default currency values
UPDATE inventory_products
SET cost_currency = 'TRY', cost_fx_rate_to_base = 1.0, sale_currency = 'TRY', sale_fx_rate_to_base = 1.0
WHERE cost_currency IS NULL OR sale_currency IS NULL;

UPDATE inventory_movements
SET cost_currency = 'TRY', cost_fx_rate_to_base = 1.0, sale_currency = 'TRY', sale_fx_rate_to_base = 1.0,
    cost_amount_base = COALESCE(cost_price, 0), sale_amount_base = COALESCE(sale_price, 0)
WHERE cost_currency IS NULL OR sale_currency IS NULL;

-- ============================================
-- 18. CUSTOM RATE TO VEHICLE COSTS
-- ============================================
SET @dbname = DATABASE();
SET @tablename = 'vehicle_costs';
SET @columnname = 'custom_rate';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(18,8) NULL COMMENT ''Manually entered FX rate (overrides API rate)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- TAMAMLANDI
-- ============================================
SELECT 'Production database update completed successfully!' as message;

