-- Migration: Add inventory tables for stock management
-- Run this SQL script to add the new tables for inventory management

USE otogaleri;

-- Inventory Products (stok ürünleri)
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
);

-- Inventory Movements (stok hareketleri)
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
);

-- Inventory Sales (stok satış kayıtları - detaylı satış takibi için)
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
);
