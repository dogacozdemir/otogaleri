-- Multi-Currency Cost Management: Exchange rate persistence and system cost flag
-- Ensures historical reports remain accurate when tenant changes default_currency

SET @dbname = DATABASE();
SET @tablename = 'vehicle_costs';

-- base_currency_at_transaction: Tenant's default_currency when cost was saved (historical accuracy)
SET @col1 = 'base_currency_at_transaction';
SET @prepared1 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col1) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @col1, ' VARCHAR(3) NULL COMMENT ''Tenant default_currency at save time''')
));
PREPARE stmt1 FROM @prepared1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- is_system_cost: 1 = system-generated (e.g. purchase price sync), 0 = user-added
SET @col2 = 'is_system_cost';
SET @prepared2 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col2) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @col2, ' TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1=system (purchase sync), 0=user''')
));
PREPARE stmt2 FROM @prepared2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Backfill base_currency_at_transaction for existing rows (use tenant's current default)
UPDATE vehicle_costs vc
INNER JOIN tenants t ON t.id = vc.tenant_id
SET vc.base_currency_at_transaction = t.default_currency
WHERE vc.base_currency_at_transaction IS NULL;

-- Migrate existing purchase_amount from vehicles to vehicle_costs (single source of truth)
-- Only for vehicles that don't already have a system purchase cost
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
