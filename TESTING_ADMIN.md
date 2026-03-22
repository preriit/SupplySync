# Testing the Admin Page

Quick guide to run and test the SupplySync admin portal.

## Prerequisites

1. **Backend running** on `http://localhost:8001` (see README or run from `backend/`):
   ```bash
   python -m uvicorn server:app --host 127.0.0.1 --port 8001
   ```
2. **PostgreSQL** with the `supplysync` database and schema applied.
3. **Admin user** in the database (see below if you don’t have one).

## Create the admin user (if needed)

Admin users are stored in the `users` table with `user_type = 'admin'`.

### Option A: Run the migration (recommended)

From the project root:

```bash
cd backend
psql -U postgres -d supplysync -f add_subscription_admin_fields.sql
```

This adds subscription fields and creates a default admin user.

### Option B: Create admin user manually (PostgreSQL)

If the `users` table already exists and supports `user_type` and `deleted_at`:

```sql
-- Insert admin user (password is 'password', bcrypt hash)
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
ON CONFLICT (email) DO NOTHING;
```

To use a different password, generate a bcrypt hash (e.g. with Python: `from passlib.hash import bcrypt; print(bcrypt.hash("your_password"))`) and replace `password_hash` in the insert.

## Admin credentials (after migration)

| Field    | Value                    |
|----------|--------------------------|
| **URL**  | `http://localhost:3000/admin/login` (when frontend is running) |
| **Username** | `admin`              |
| **Password** | `password`              |

## Test admin via API (no frontend)

With the backend running and an admin user in the DB:

**PowerShell:**

```powershell
$body = @{ username = "admin"; password = "password" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/api/admin/auth/login" -Method Post -ContentType "application/json" -Body $body
```

**curl:**

```bash
curl -X POST "http://localhost:8001/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

You should get `access_token` and `admin` in the response.

## "Invalid admin credentials" on login

This means either no user exists with that **username** and **user_type = 'admin'**, or the **password** doesn’t match the hash in the database.

### 1. Check if an admin user exists

In PowerShell (use your Postgres path and password):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -U postgres -d supplysync -c "SELECT id, username, email, user_type, is_active FROM users WHERE user_type = 'admin';"
```

If you see no rows, you need to create an admin user. If you see a row, the password for that user may not match what you’re typing.

### 2. Ensure default admin works (username: admin, password: password)

From the project root, run the script that inserts or resets the admin user:

**PowerShell:**

```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -U postgres -d supplysync -f "C:\Users\admin\Desktop\Github\SupplySync\SupplySync\backend\scripts\ensure_admin_user.sql"
```

(Adjust the path if your repo is elsewhere.)

Then log in at **http://localhost:3000/admin/login** with **username:** `admin`, **password:** `password`.

## Admin routes (frontend)

Once logged in, you can open:

| Path | Description |
|------|-------------|
| `/admin/login` | Admin login |
| `/admin/dashboard` | Dashboard (stats) |
| `/admin/users` | User management |
| `/admin/merchants` | Merchant management |
| `/admin/reference-data` | Reference data (sizes, types, etc.) |

## Frontend .env for admin

Ensure `frontend/.env` has the API base URL **including** `/api`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001/api
```

Then start the frontend (from `frontend/`):

```bash
npm run start
```

and go to **http://localhost:3000/admin/login**.

## 401 on admin pages

- **Login:** Ensure the admin user exists and password matches (e.g. `password` if you used the migration).
- **After login:** Admin pages send `Authorization: Bearer <admin_token>`. If you see 401, clear `admin_token` and `admin_user` in localStorage and log in again.
