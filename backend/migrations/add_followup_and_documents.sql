-- Migration: Add followup and document tables
-- Run this SQL script to add the new tables for followups and documents

USE otogaleri;

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

