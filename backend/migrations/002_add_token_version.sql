-- Migration: Add token_version column to users table
-- This enables token invalidation when passwords are changed

-- Add token_version column (defaults to 0 for existing users)
ALTER TABLE users 
ADD COLUMN token_version INT NOT NULL DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX idx_users_token_version ON users(tenant_id, id, token_version);

