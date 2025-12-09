-- Migration: Add ACL (Access Control List) permissions table
-- Run this SQL script to add the ACL system for role-based permissions

USE otogaleri;

-- ACL Permissions table
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

