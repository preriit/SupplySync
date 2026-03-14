# SupplySync – Development setup (Windows laptop)

Get the backend and frontend running locally. Do these steps in order.

---

## Prerequisites

- **Python 3.11+** – [python.org](https://www.python.org/downloads/) (check "Add Python to PATH")
- **Node.js 18+** – [nodejs.org](https://nodejs.org/) (LTS)
- **PostgreSQL 15+** – [postgresql.org](https://www.postgresql.org/download/windows/) or [Postgres.app](https://postgresapp.com/) (install and ensure `psql` is on PATH, or use pgAdmin)
- **Git** – already have the repo at `C:\Users\admin\Desktop\Github\SupplySync`

---

## 1. PostgreSQL: create database and apply schema

1. Start PostgreSQL (from Services or your installed app).

2. Create the database and a user (if you don’t use the default `postgres` user):
   - **Option A – pgAdmin:** Create database `supplysync`. Note your username/password.
   - **Option B – psql (PowerShell):**  
     (Adjust path if your Postgres install is elsewhere.)
   ```powershell
   & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE supplysync;"
   ```

3. Apply schema and migrations (run from repo root; replace `postgres` if you use another user):

   ```powershell
   cd C:\Users\admin\Desktop\Github\SupplySync\backend

   psql -U postgres -d supplysync -f init_db.sql
   psql -U postgres -d supplysync -f schema_v2.sql
   psql -U postgres -d supplysync -f seed_data.sql
   psql -U postgres -d supplysync -f add_sizes_table.sql
   psql -U postgres -d supplysync -f add_transactions_table.sql
   psql -U postgres -d supplysync -f add_activity_log_table.sql
   ```

   If `psql` is not on PATH, use the full path, e.g.:
   `"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d supplysync -f init_db.sql`

---

## 2. Backend: env and run

1. Copy the example env and edit with your DB URL and secret:

   ```powershell
   cd C:\Users\admin\Desktop\Github\SupplySync\backend
   copy .env.example .env
   notepad .env
   ```

   Set at least:

   - `DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/supplysync`  
     Example: `postgresql://postgres:postgres@localhost:5432/supplysync`
   - `JWT_SECRET_KEY=` any long random string (e.g. from [randomkeygen](https://randomkeygen.com/))

   Leave `JWT_ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` as in `.env.example` unless you need different values.  
   For image upload later, add your Cloudinary vars; without them the app still runs but uploads will fail.

2. Create a virtualenv, install deps, and start the API:

   ```powershell
   cd C:\Users\admin\Desktop\Github\SupplySync\backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

   Keep this terminal open. Backend will be at **http://localhost:8001**.  
   - Docs: http://localhost:8001/docs  
   - Health: http://localhost:8001/health

---

## 3. Frontend: env and run

In a **new** terminal:

1. Copy env and set backend URL:

   ```powershell
   cd C:\Users\admin\Desktop\Github\SupplySync\frontend
   copy .env.example .env
   notepad .env
   ```

   Set:

   - `REACT_APP_BACKEND_URL=http://localhost:8001`  
     (no trailing slash)

2. Install and start:

   ```powershell
   cd C:\Users\admin\Desktop\Github\SupplySync\frontend
   npm install
   npm start
   ```

   Browser should open to **http://localhost:3000**.

---

## 4. Create a test dealer (optional)

- **In the app:** Open http://localhost:3000 → Sign up → register as a dealer.
- **Or via API (PowerShell):**

  ```powershell
  curl -X POST "http://localhost:8001/api/auth/register/dealer" `
    -H "Content-Type: application/json" `
    -d '{\"username\":\"dealer1\",\"email\":\"dealer1@test.com\",\"phone\":\"9876543210\",\"password\":\"password123\",\"merchant_name\":\"Test Shop\"}'
  ```

  Then log in at http://localhost:3000 with that email and password.

---

## Quick reference

| What        | URL / command |
|------------|----------------|
| Frontend   | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| API docs   | http://localhost:8001/docs |
| Backend (run) | `cd backend && .\.venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload` |
| Frontend (run) | `cd frontend && npm start` |

---

## Troubleshooting

- **"psql not found"** – Use full path to `psql.exe` (see step 1) or add PostgreSQL `bin` to PATH.
- **Backend: "DATABASE_URL" or "JWT_SECRET_KEY"** – Ensure `backend\.env` exists and has those set; restart uvicorn.
- **Backend: Cloudinary errors on image upload** – Add valid `CLOUDINARY_*` vars in `backend\.env` or ignore until you need uploads.
- **Frontend: 401 or CORS** – Ensure `REACT_APP_BACKEND_URL` in `frontend\.env` is exactly `http://localhost:8001` and restart `npm start`.
- **Port already in use** – Change backend port in `uvicorn` (e.g. `--port 8002`) and set `REACT_APP_BACKEND_URL` to that port.
