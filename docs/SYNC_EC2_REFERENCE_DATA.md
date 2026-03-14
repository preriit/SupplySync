# Use EC2 reference data and admin users on your laptop

This lets you pull the **same reference data** (body types, make types, surface types, sizes, categories, sub-categories, etc.) and **admin user accounts** from your EC2 instance into your local database.

---

## What gets synced

- **Reference tables (full copy, upsert by id):**  
  `body_types`, `make_types`, `surface_types`, `application_types`, `qualities`, `categories`, `sizes`, `sub_categories`
- **Admin users only:**  
  Rows in `users` where `user_type = 'admin'` (upsert by email so you can re-run safely).

Your local dealers, merchants, and products are **not** changed. Existing reference rows are updated to match EC2; new rows are inserted.

---

## Prerequisites

- Your **local** database already has the schema applied (you ran `init_db.sql`, `schema_v2.sql`, etc., as in [DEV_SETUP.md](../DEV_SETUP.md)).
- You can reach the **EC2 database** from your laptop (direct connection to RDS or via SSH tunnel to Postgres on EC2).
- You have the **source DB URL** (e.g. from your EC2 backend `.env`):  
  `postgresql://USER:PASSWORD@HOST:5432/supplysync`

---

## Step 1: Export from EC2 to a SQL file

From your **laptop** (or from EC2 if you run the script there), run the sync script against the **EC2/RDS** database.

**Option A – Run from your laptop (if the DB is reachable)**

```powershell
cd C:\Users\admin\Desktop\Github\SupplySync\backend

# Use your backend venv
.\.venv\Scripts\activate

# Set the EC2/RDS database URL (same format as DATABASE_URL on EC2)
$env:SOURCE_DATABASE_URL = "postgresql://postgres:YOUR_EC2_DB_PASSWORD@your-rds-endpoint.region.rds.amazonaws.com:5432/supplysync"

python scripts/sync_reference_data_from_ec2.py
```

**Option B – Pass URL as argument**

```powershell
python scripts/sync_reference_data_from_ec2.py "postgresql://postgres:PASSWORD@host:5432/supplysync"
```

**Option C – Run on EC2 and copy the file down**

On the EC2 instance (e.g. over SSH):

```bash
cd /home/ubuntu/your-repo/backend
source venv/bin/activate
export SOURCE_DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/supplysync"   # or RDS host
python scripts/sync_reference_data_from_ec2.py --output /tmp/ec2_reference_and_admin_data.sql
```

Then copy `/tmp/ec2_reference_and_admin_data.sql` to your laptop (e.g. with `scp`).

The script writes **`backend/ec2_reference_and_admin_data.sql`** (or the path you pass with `--output`).

---

## Step 2: Import into your local database

On your **laptop**, run the generated SQL against your **local** `supplysync` database:

```powershell
cd C:\Users\admin\Desktop\Github\SupplySync\backend

# Use your local postgres user and DB name
psql -U postgres -d supplysync -f ec2_reference_and_admin_data.sql
```

If `psql` is not on PATH, use the full path, e.g.:

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d supplysync -f ec2_reference_and_admin_data.sql
```

---

## Step 3: Use it

- **Reference data:** Your local app (backend + frontend) will now use the same body types, make types, sizes, categories, sub-categories, etc. as EC2.
- **Admin login:** Log in to the admin UI locally with the **same admin username/password** you use on EC2 (e.g. `http://localhost:3000/admin/login`).

You can re-run the script and Step 2 anytime to refresh reference data and admin accounts from EC2.
