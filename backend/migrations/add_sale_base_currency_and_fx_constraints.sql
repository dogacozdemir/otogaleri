-- 1. Add base_currency_at_sale to vehicle_sales (freeze tenant's base currency at sale time)
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

-- 2. Fix any invalid fx_rate_to_base (0 or null) before adding constraint
UPDATE vehicle_costs SET fx_rate_to_base = 1 WHERE fx_rate_to_base IS NULL OR fx_rate_to_base <= 0;
UPDATE vehicle_sales SET sale_fx_rate_to_base = 1 WHERE sale_fx_rate_to_base IS NULL OR sale_fx_rate_to_base <= 0;

-- 3. CHECK constraints for fx_rate_to_base > 0 (MySQL 8.0.16+)
-- Add only if not exists - use separate statements; if constraint exists, this will error (run migration once)
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
