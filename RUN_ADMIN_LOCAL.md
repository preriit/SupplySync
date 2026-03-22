# Run admin locally (no Docker)

Use two terminals. Run from the **project root** or the paths below. The database is **fresh** (no migrated/imported data): run `reset_db.py` once to create schema and default admin.

---

## One-time: Fresh database

Ensure PostgreSQL is running. If the `supplysync` database does not exist, create it (e.g. in psql: `CREATE DATABASE supplysync;`). Then reset and apply schema (drops all tables, re-creates everything, creates default admin):

```powershell
cd C:\Users\admin\Desktop\Github\SupplySync\SupplySync\backend
python reset_db.py
```

Then start the backend and frontend (below). Admin login: **admin** / **password**.

---

## Terminal 1: Backend

```powershell
cd C:\Users\admin\Desktop\Github\SupplySync\SupplySync\backend
python -m uvicorn server:app --host 127.0.0.1 --port 8001
```

Leave this running. You should see: `Uvicorn running on http://127.0.0.1:8001`.

**If port 8001 is in use:** use port 8002 and keep your frontend `.env` as `REACT_APP_BACKEND_URL=http://localhost:8002/api`:

```powershell
python -m uvicorn server:app --host 127.0.0.1 --port 8002
```

---

## Terminal 2: Frontend

Open a **new** PowerShell window:

```powershell
cd C:\Users\admin\Desktop\Github\SupplySync\SupplySync\frontend
npm install --legacy-peer-deps
npm run start
```

Use `--legacy-peer-deps` so npm ignores peer conflicts (react-scripts wants TS 4, other deps use TS 5; the app runs fine).

**Quieter install (no deprecation warnings):** Run `npm run install:deps` instead of `npm install --legacy-peer-deps`. Same behavior, less output.  
**Note:** Deprecation warnings (e.g. `inflight`) come from transitive dependencies; they are safe to ignore.

Wait until it says "Compiled successfully" and the browser opens (or open it yourself).

---

## Open admin

- **Admin login:** http://localhost:3000/admin/login  
- Log in with **admin** / **password** (default from fresh schema).

---

## If something fails

| Problem | Fix |
|--------|-----|
| Backend: "Could not import module server" | You're not in the backend folder. Run the first `cd` command above, then run the `python -m uvicorn` line again. |
| Backend: Port 8001 already in use | Use port 8002 in the uvicorn command and set `frontend\.env` to `REACT_APP_BACKEND_URL=http://localhost:8002/api`. |
| Frontend: "Cannot find package.json" / ENOENT | You're in the wrong folder (e.g. system32). Run the `cd` to the **frontend** folder above, then `npm run start`. |
| Frontend: "Cannot find module 'ajv/...'" | From the **frontend** folder run: `npm install --legacy-peer-deps` then `npm run start`. |
| Frontend: `TypeError: Cannot read properties of undefined (reading 'date')` in ajv-keywords/_formatLimit.js | Run `npm run install:deps` (or `npm install --legacy-peer-deps`). The **postinstall** script re-applies the fix. If you still see it, run `node scripts/patch-ajv-keywords.js` then `npm run start`. |
| Frontend: ERESOLVE / peer dependency conflict (React, date-fns, TypeScript, etc.) | Always use: `npm install --legacy-peer-deps` then `npm run start`. |
| Admin login: 401 or network error | Backend not running or wrong URL. Check backend is running and that `frontend\.env` has `REACT_APP_BACKEND_URL=http://localhost:8001/api` (or 8002 if you used 8002). |
| Admin login: **500 Internal Server Error** | **Check the backend terminal** (where uvicorn is running). The real error is printed as `[Admin login 500] ...`. Fix that (e.g. DB, JWT_SECRET_KEY, missing admin user). To see the 500 body in PowerShell: see "See 500 response body" below. |
| **Postgres: "password authentication failed for user postgres"** | The password in `backend\.env` (inside `DATABASE_URL`) does not match your local PostgreSQL user. See "Fix Postgres password" below. |
| Need a **fresh database** (no old/migrated data) | From `backend` run: `python reset_db.py`. Then start backend and frontend again. |
| PostgreSQL errors when backend starts | Ensure Postgres is running and `backend\.env` has the correct `DATABASE_URL`. Run `python reset_db.py` from `backend` so schema is applied. |

---

### Fix Postgres password ("password authentication failed for user postgres")

Your backend uses `DATABASE_URL` from `backend\.env`. The password in that URL must match the password of the PostgreSQL user (e.g. `postgres`) on your machine.

**Option A – Set the password in `.env` to match Postgres**

1. In `backend\.env`, set `DATABASE_URL` to the password your local Postgres actually uses. Example:
   - `postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/supplysync`
2. Restart the backend (stop uvicorn, then start it again).

**Option B – Set Postgres user password to match `.env`**

If you’d rather keep the password that’s already in `DATABASE_URL`, set the `postgres` user’s password in PostgreSQL to that value:

1. Open a terminal and connect as a superuser (e.g. `psql -U postgres` or use pgAdmin).
2. Run: `ALTER USER postgres PASSWORD 'the_password_from_your_DATABASE_URL';`
3. Restart the backend.

After fixing, try admin login again.

---

### See 500 response body in PowerShell

When `Invoke-RestMethod` throws on 500, the body is in the exception. Run:

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8001/api/admin/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"password"}'
} catch {
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $reader.BaseStream.Position = 0
  $reader.ReadToEnd()
}
```

Use the same port as your backend (8001 or 8002). The output is the JSON error detail from the server.

---

**Summary:** Terminal 1 = backend (uvicorn). Terminal 2 = frontend (npm run start). Then open http://localhost:3000/admin/login.
