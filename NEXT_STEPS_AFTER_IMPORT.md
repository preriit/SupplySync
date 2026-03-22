# Next steps after you have the SQL file

**Prefer a fresh DB?** Use `backend/reset_db.py` and RUN_ADMIN_LOCAL.md instead (no import).

You have the exported admin data SQL file. Do these in order to import it and check that the frontend loads.

---

## 1. Import the SQL file into your local database

**Prerequisite:** PostgreSQL is installed and the `supplysync` database exists with the schema (run the migrations in README if you haven’t).

### Option A – PowerShell script (recommended on Windows)

In PowerShell, from the project root (folder that contains `backend`, `frontend`, `scripts`):

```powershell
cd c:\Users\admin\Desktop\Github\SupplySync\SupplySync

# Default: localhost, user postgres, password postgres, database supplysync
.\scripts\import_admin_data.ps1 -SqlFile "C:\path\to\supplysync_admin_data_20260314_123456.sql"
```

Use the **actual path** to your `.sql` file. If your Postgres password is different:

```powershell
.\scripts\import_admin_data.ps1 -SqlFile ".\supplysync_admin_data_20260314_123456.sql" -PgPassword "your_password"
```

### Option B – Manual (PowerShell, no script – use this if "running scripts is disabled")

Copy and run these one at a time (replace the SQL file path and password if needed):

```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d supplysync -c "TRUNCATE TABLE sizes CASCADE; TRUNCATE TABLE make_types CASCADE; TRUNCATE TABLE body_types CASCADE; TRUNCATE TABLE application_types CASCADE; TRUNCATE TABLE surface_types CASCADE; TRUNCATE TABLE qualities CASCADE;"
psql -h localhost -U postgres -d supplysync -f "C:\path\to\supplysync_admin_data_20260314_123456.sql"
```

### Option C – Use script despite "running scripts is disabled"

Run the script with a one-time bypass (no need to change system execution policy):

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\import_admin_data.ps1" -SqlFile "C:\path\to\supplysync_admin_data_XXXXXX.sql"
```

After this, your local DB has the same reference data and users (including admin) as EC2.

---

## 2. Start the backend

In a terminal (PowerShell or Command Prompt):

```powershell
cd c:\Users\admin\Desktop\Github\SupplySync\SupplySync\backend
python -m uvicorn server:app --host 127.0.0.1 --port 8001
```

Leave this running. You should see: `Uvicorn running on http://127.0.0.1:8001`.

Quick check: open in browser **http://127.0.0.1:8001/api/health** — you should see `{"status":"healthy",...}`.

---

## 3. Start the frontend and check if it loads

In a **new** terminal:

```powershell
cd c:\Users\admin\Desktop\Github\SupplySync\SupplySync\frontend
npm run start
```

- If it starts, the browser should open to **http://localhost:3000** (or you open it manually).
- Go to **http://localhost:3000/admin/login** and log in with your EC2 admin credentials (e.g. the admin user from the SQL you imported).

**If the frontend fails to start** (e.g. error about `ajv-keywords` or another module):

```powershell
npm install ajv-keywords --legacy-peer-deps
npm run start
```

If it still fails, try:

```powershell
npm install
npm run start
```

---

## 4. Verify the admin page is loading

1. Open **http://localhost:3000/admin/login** (with frontend running).
2. You should see the **Admin Portal** login page.
3. Log in with the **same username/password** as the admin user from EC2 (the one in the SQL you imported).
4. After login you should be on the **Admin Dashboard** (stats, sidebar with Users, Merchants, Reference Data).

If the login page loads and you can log in and see the dashboard, the frontend is loading correctly and the imported data (admin user + reference data) is being used.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Import the SQL file (PowerShell script or manual `psql -f`). |
| 2 | Start backend: `cd backend` → `python -m uvicorn server:app --host 127.0.0.1 --port 8001`. |
| 3 | Start frontend: `cd frontend` → `npm run start`. |
| 4 | Open **http://localhost:3000/admin/login** and log in with your EC2 admin credentials. |

If the backend is running but the frontend won’t start, you can still check the API: use **http://127.0.0.1:8001/api/health** and test admin login with PowerShell (see TESTING_ADMIN.md).
