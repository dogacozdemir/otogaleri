-- Migration: Add vehicle_images table
USE otogaleri;

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
);

