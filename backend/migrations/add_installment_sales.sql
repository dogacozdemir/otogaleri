-- Migration: Add installment sales tables
-- Run this SQL script to add the new tables for installment sales and payments

USE otogaleri;

-- Vehicle installment sales (taksitli satış ana kaydı)
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
);

-- Vehicle installment payments (taksit ödemeleri)
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
);
