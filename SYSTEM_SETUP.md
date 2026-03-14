# SupplySync – System setup (Windows)

Do this **once** on your laptop. After this, use [DEV_SETUP.md](DEV_SETUP.md) to run the app.

---

## Current status

| Tool | Needed | Your system |
|------|--------|-------------|
| **Node.js 18+** | Yes | ✅ Installed (v20) |
| **npm** | Yes | ✅ Installed |
| **Python 3.11+** | Yes | ❌ Install below |
| **PostgreSQL 15+** | Yes | ❌ Install below |

---

## Step 1: Install Python 3.11+

1. Open **https://www.python.org/downloads/**
2. Download **Python 3.11** or **3.12** (Windows installer, 64-bit).
3. Run the installer.
4. **Important:** On the first screen, check **"Add python.exe to PATH"**, then click **Install Now**.
5. Close any open terminals, then open a **new** PowerShell and run:
   ```powershell
   python --version
   ```
   You should see something like `Python 3.11.x` or `Python 3.12.x`.

---

## Step 2: Install PostgreSQL 15+

1. Open **https://www.postgresql.org/download/windows/**
2. Click **"Download the installer"** (EDB).
3. Run the installer. Use the default port **5432** and set a **password for the `postgres` user** (e.g. `postgres`) – you’ll need it for `DATABASE_URL`.
4. At the end, you can leave **Stack Builder** unchecked.
5. Add PostgreSQL to your PATH (so `psql` works in any terminal):
   - Press **Win + R**, type `sysdm.cpl`, Enter → **Advanced** tab → **Environment Variables**.
   - Under **System variables**, select **Path** → **Edit** → **New**.
   - Add: `C:\Program Files\PostgreSQL\15\bin` (use **16** if you installed 16).
   - OK out. **Close and reopen PowerShell.**
6. Test:
   ```powershell
   psql --version
   ```
   You should see `psql (PostgreSQL) 15.x` or similar.

---

## Step 3: Disable Windows “python” store alias (if needed)

If `python --version` opens the Microsoft Store instead of showing a version:

1. **Settings** → **Apps** → **Advanced app settings** → **App execution aliases**.
2. Turn **Off** the aliases for **python.exe** and **python3.exe**.

Then install Python from python.org (Step 1) and use `python` in the terminal.

---

## Step 4: Verify everything

In a **new** PowerShell:

```powershell
python --version   # e.g. Python 3.11.9
node --version     # e.g. v20.20.1
npm --version      # e.g. 11.11.0
psql --version     # e.g. psql (PostgreSQL) 15.x
```

If all four commands show versions, you’re ready for **DEV_SETUP.md** (database, backend, frontend).

---

## Next

→ Open **[DEV_SETUP.md](DEV_SETUP.md)** and follow steps 1–4 to create the database, run the backend, and run the frontend.
