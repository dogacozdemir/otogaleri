-- Migration: Add vehicle quotes/quotation system
-- Run this SQL script to add the new table for vehicle quotes

USE otogaleri;

-- Vehicle quotes (teklif/teklifname sistemi)
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
);

