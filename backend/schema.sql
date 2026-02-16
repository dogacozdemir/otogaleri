-- Otogaleri veritabani temel şeması (multi-tenant)

CREATE DATABASE IF NOT EXISTS otogaleri CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE otogaleri;

-- Tenants (galeriler)
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
  country VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (tenant icindeki kullanicilar)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','admin','manager','sales','accounting') NOT NULL DEFAULT 'owner',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_tenant_email (tenant_id, email)
);

-- Password reset tokens (şifremi unuttum akışı)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of token',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branches (subeler)
CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NULL,
  city VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  address TEXT NULL,
  phone VARCHAR(50) NULL,
  tax_office VARCHAR(150) NULL,
  tax_number VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id)
);

-- Staff (calisanlar - tenant + sube baglantili)
CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  branch_id INT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(50) NULL,
  role ENUM('owner','manager','sales','accounting','other') NOT NULL DEFAULT 'sales',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id)
);

-- Commission rules (prim kurallari)
CREATE TABLE IF NOT EXISTS commission_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  staff_id INT NULL,
  branch_id INT NULL,
  rule_type ENUM('percentage_of_sale','percentage_of_profit','monthly_target_bonus') NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  currency VARCHAR(3) NULL,
  target_amount DECIMAL(12,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id)
);

-- FX rates cache (freecurrencyapi icin)
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

-- Vehicles (gelismis arac tablosu)
CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_number INT NULL,
  branch_id INT NULL,
  maker VARCHAR(100) NULL,
  model VARCHAR(100) NULL,
  production_year INT NULL,
  arrival_date DATE NULL,
  transmission VARCHAR(50) NULL,
  chassis_no VARCHAR(100) NULL,
  plate_number VARCHAR(20) NULL,
  km INT NULL,
  fuel VARCHAR(50) NULL,
  grade VARCHAR(100) NULL,
  cc INT NULL,
  weight INT NULL,
  color VARCHAR(50) NULL,
  engine_no VARCHAR(100) NULL,
  other TEXT NULL,
  status ENUM('new','used','damaged','repaired') DEFAULT 'used',
  stock_status ENUM('in_stock','on_sale','reserved','sold') DEFAULT 'in_stock',
  location VARCHAR(200) NULL,
  purchase_amount DECIMAL(12,2) NULL,
  purchase_currency VARCHAR(3) NULL,
  purchase_fx_rate_to_base DECIMAL(18,8) NULL,
  purchase_date DATE NULL,
  -- @deprecated Use vehicle_sales.sale_amount, vehicle_sales.sale_currency, vehicle_sales.sale_fx_rate_to_base, vehicle_sales.sale_date instead
  sale_price DECIMAL(12,2) NULL,
  sale_currency VARCHAR(3) NULL,
  sale_fx_rate_to_base DECIMAL(18,8) NULL,
  sale_date DATE NULL,
  is_sold TINYINT(1) NOT NULL DEFAULT 0,
  target_profit DECIMAL(12,2) NULL,
  features JSON NULL,
  contract_pdf_path TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_tenant_sold (tenant_id, is_sold),
  INDEX idx_tenant_maker_model (tenant_id, maker, model),
  UNIQUE KEY idx_tenant_vehicle_number (tenant_id, vehicle_number)
);

-- Vehicle costs (harcamalar, kendi para birimi ve kur bilgisiyle)
CREATE TABLE IF NOT EXISTS vehicle_costs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  cost_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL,
  cost_date DATE NOT NULL,
  category ENUM('purchase','shipping','customs','repair','insurance','tax','other') DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_date (cost_date)
);

-- Vehicle sales (satış kaydı, hangi personel, hangi kur vs.)
CREATE TABLE IF NOT EXISTS vehicle_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  branch_id INT NULL,
  staff_id INT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50) NULL,
  customer_address TEXT NULL,
  plate_number VARCHAR(20) NULL,
  key_count INT NULL,
  sale_amount DECIMAL(12,2) NOT NULL,
  sale_currency VARCHAR(3) NOT NULL,
  sale_fx_rate_to_base DECIMAL(18,8) NOT NULL,
  sale_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_tenant_date (tenant_id, sale_date)
);

-- Customers (müşteriler)
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(200) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  total_spent_base DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  UNIQUE KEY uniq_tenant_phone (tenant_id, phone)
);

-- Accounting: income (gelir) ve expenses (gider)
CREATE TABLE IF NOT EXISTS income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  branch_id INT NULL,
  vehicle_id INT NULL,
  customer_id INT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL,
  amount_base DECIMAL(14,2) NOT NULL,
  income_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_tenant_date (tenant_id, income_date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  branch_id INT NULL,
  vehicle_id INT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fx_rate_to_base DECIMAL(18,8) NOT NULL,
  amount_base DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  INDEX idx_tenant_date (tenant_id, expense_date)
);

-- Commission payouts (ödenen primler)
CREATE TABLE IF NOT EXISTS commission_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  staff_id INT NOT NULL,
  vehicle_id INT NULL,
  rule_id INT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  amount_base DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (rule_id) REFERENCES commission_rules(id) ON DELETE SET NULL,
  INDEX idx_tenant_staff (tenant_id, staff_id)
);

-- Post-sale followups (satış sonrası takip)
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
);

-- Followup templates (otomatik takip şablonları)
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
);

-- Vehicle documents (araç belgeleri)
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  document_type ENUM('contract', 'registration', 'insurance', 'inspection', 'customs', 'invoice', 'eksper', 'grade', 'other') NOT NULL,
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
);

-- Customer documents (müşteri belgeleri)
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
);

-- Custom reports (özelleştirilmiş raporlar)
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
);

-- Report runs (rapor çalıştırma geçmişi)
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
);
