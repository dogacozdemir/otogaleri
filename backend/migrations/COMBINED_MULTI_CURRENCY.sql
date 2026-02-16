-- =============================================================================
-- Multi-Currency ile ilgili tüm veritabanı değişiklikleri
-- =============================================================================

USE otogaleri;

-- -----------------------------------------------------------------------------
-- 1. FX RATES CACHE TABLOSU (Döviz kurları önbelleği - freecurrencyapi için)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fx_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL,
  quote_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18,8) NOT NULL,
  rate_date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'freecurrencyapi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rate (base_currency, quote_currency, rate_date)
);

-- -----------------------------------------------------------------------------
-- 2. VEHICLE_SALES - base_currency_at_sale ve FX constraint
-- -----------------------------------------------------------------------------

-- 2.1 base_currency_at_sale sütunu (satış anında tenant'ın base currency'si)
SET @dbname = DATABASE();
SET @tablename = 'vehicle_sales';
SET @col = 'base_currency_at_sale';
SET @prepared = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @col, ' VARCHAR(3) NULL COMMENT ''Tenant default_currency at sale time''')
));
PREPARE stmt FROM @prepared;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill base_currency_at_sale from tenant
UPDATE vehicle_sales vs
INNER JOIN tenants t ON t.id = vs.tenant_id
SET vs.base_currency_at_sale = t.default_currency
WHERE vs.base_currency_at_sale IS NULL;

-- 2.2 Geçersiz fx_rate değerlerini düzelt (constraint eklemeden önce)
UPDATE vehicle_costs SET fx_rate_to_base = 1 WHERE fx_rate_to_base IS NULL OR fx_rate_to_base <= 0;
UPDATE vehicle_sales SET sale_fx_rate_to_base = 1 WHERE sale_fx_rate_to_base IS NULL OR sale_fx_rate_to_base <= 0;

-- 2.3 CHECK constraints (MySQL 8.0.16+)
SET @vc_check = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_costs' AND CONSTRAINT_NAME = 'chk_vehicle_costs_fx_rate');
SET @vc_sql = IF(@vc_check = 0, 
  'ALTER TABLE vehicle_costs ADD CONSTRAINT chk_vehicle_costs_fx_rate CHECK (fx_rate_to_base > 0)',
  'SELECT 1');
PREPARE vc_stmt FROM @vc_sql;
EXECUTE vc_stmt;
DEALLOCATE PREPARE vc_stmt;

SET @vs_check = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_sales' AND CONSTRAINT_NAME = 'chk_vehicle_sales_fx_rate');
SET @vs_sql = IF(@vs_check = 0,
  'ALTER TABLE vehicle_sales ADD CONSTRAINT chk_vehicle_sales_fx_rate CHECK (sale_fx_rate_to_base > 0)',
  'SELECT 1');
PREPARE vs_stmt FROM @vs_sql;
EXECUTE vs_stmt;
DEALLOCATE PREPARE vs_stmt;

-- -----------------------------------------------------------------------------
-- 3. VEHICLE_COSTS - FX persistence ve custom rate
-- -----------------------------------------------------------------------------

-- 3.1 base_currency_at_transaction (maliyet kaydedildiğinde tenant'ın base currency'si)
SET @tablename = 'vehicle_costs';
SET @col1 = 'base_currency_at_transaction';
SET @prepared1 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col1) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @col1, ' VARCHAR(3) NULL COMMENT ''Tenant default_currency at save time''')
));
PREPARE stmt1 FROM @prepared1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 3.2 is_system_cost (1 = sistem oluşturdu, 0 = kullanıcı ekledi)
SET @col2 = 'is_system_cost';
SET @prepared2 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col2) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @col2, ' TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1=system (purchase sync), 0=user''')
));
PREPARE stmt2 FROM @prepared2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3.3 custom_rate (manuel FX kuru girişi - API kurunu override eder)
SET @columnname = 'custom_rate';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(18,8) NULL COMMENT ''Manually entered FX rate (overrides API rate)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Backfill base_currency_at_transaction
UPDATE vehicle_costs vc
INNER JOIN tenants t ON t.id = vc.tenant_id
SET vc.base_currency_at_transaction = t.default_currency
WHERE vc.base_currency_at_transaction IS NULL;

-- Mevcut purchase_amount'ları vehicle_costs'a migrate et (tek kaynak)
INSERT INTO vehicle_costs (tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category, custom_rate, base_currency_at_transaction, is_system_cost)
SELECT 
  v.tenant_id,
  v.id,
  'Alış fiyatı (sistem)',
  v.purchase_amount,
  COALESCE(v.purchase_currency, t.default_currency),
  COALESCE(v.purchase_fx_rate_to_base, 1),
  COALESCE(v.purchase_date, CURDATE()),
  'purchase',
  NULL,
  t.default_currency,
  1
FROM vehicles v
INNER JOIN tenants t ON t.id = v.tenant_id
WHERE v.purchase_amount IS NOT NULL AND v.purchase_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_costs vc 
    WHERE vc.vehicle_id = v.id AND vc.tenant_id = v.tenant_id AND vc.is_system_cost = 1
  );

-- -----------------------------------------------------------------------------
-- 4. INVENTORY - Para birimi desteği
-- -----------------------------------------------------------------------------

-- 4.1 inventory_products
SET @tablename = 'inventory_products';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cost_currency') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_currency VARCHAR(3) NULL DEFAULT ''TRY''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cost_fx_rate_to_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_fx_rate_to_base DECIMAL(18,8) NULL DEFAULT 1.0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sale_currency') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_currency VARCHAR(3) NULL DEFAULT ''TRY''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sale_fx_rate_to_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_fx_rate_to_base DECIMAL(18,8) NULL DEFAULT 1.0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 4.2 inventory_movements
SET @tablename = 'inventory_movements';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cost_currency') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_currency VARCHAR(3) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cost_fx_rate_to_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_fx_rate_to_base DECIMAL(18,8) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sale_currency') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_currency VARCHAR(3) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sale_fx_rate_to_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_fx_rate_to_base DECIMAL(18,8) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cost_amount_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN cost_amount_base DECIMAL(14,2) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sale_amount_base') > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN sale_amount_base DECIMAL(14,2) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Mevcut kayıtları güncelle
UPDATE inventory_products
SET cost_currency = 'TRY', cost_fx_rate_to_base = 1.0, sale_currency = 'TRY', sale_fx_rate_to_base = 1.0
WHERE cost_currency IS NULL OR sale_currency IS NULL;

UPDATE inventory_movements
SET cost_currency = 'TRY', cost_fx_rate_to_base = 1.0, sale_currency = 'TRY', sale_fx_rate_to_base = 1.0,
    cost_amount_base = COALESCE(cost_price, 0), sale_amount_base = COALESCE(sale_price, 0)
WHERE cost_currency IS NULL OR sale_currency IS NULL;
