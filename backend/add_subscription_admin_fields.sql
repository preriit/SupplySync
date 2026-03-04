-- Add subscription and admin fields to support subscription-based access control
-- Run this migration to add subscription tracking and admin user type

-- 1. Add subscription fields to merchants table
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Add soft delete field to users table (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. Update user_type to support 'admin' type
-- Current values: 'dealer', 'subdealer'
-- New value: 'admin' (for platform administrators)

-- 4. Create admin user
-- Username: admin, Password: password (hashed)
-- Note: The password hash below is bcrypt hash of 'password'
INSERT INTO users (username, email, phone, password_hash, user_type, role, is_active, is_verified)
VALUES (
  'admin',
  'admin@supplysync.com',
  '0000000000',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYB7VKK8K.K',  -- bcrypt hash of 'password'
  'admin',
  'super_admin',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_subscription ON merchants(subscription_status, subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active);
CREATE INDEX IF NOT EXISTS idx_users_type_role ON users(user_type, role);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

-- 6. Add comments
COMMENT ON COLUMN merchants.subscription_status IS 'Subscription status: trial, active, expired, suspended';
COMMENT ON COLUMN merchants.subscription_expires_at IS 'Subscription expiry date for access control';
COMMENT ON COLUMN users.user_type IS 'User type: dealer, subdealer, admin';
COMMENT ON COLUMN users.role IS 'Role: super_admin (platform admin), admin (merchant admin), manager, viewer';
