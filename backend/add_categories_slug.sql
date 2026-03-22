-- Add slug and other schema_v2 columns to categories if created from init_db (no slug).
-- Idempotent: safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(100) DEFAULT 'tiles';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
