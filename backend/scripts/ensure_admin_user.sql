-- Ensure an admin user exists: username 'admin', password 'password'.
-- Run with: psql -h 127.0.0.1 -U postgres -d supplysync -f scripts/ensure_admin_user.sql

INSERT INTO users (id, username, email, phone, password_hash, user_type, role, is_active, is_verified, created_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@supplysync.com',
  '0000000000',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYB7VKK8K.K',
  'admin',
  'super_admin',
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  username = EXCLUDED.username,
  user_type = EXCLUDED.user_type,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
