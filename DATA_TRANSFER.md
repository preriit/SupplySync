# Transfer Admin-Level Data: EC2 → Local

**Default:** For a **fresh local database** with no migrated data, use `backend/reset_db.py` (see RUN_ADMIN_LOCAL.md). No EC2 export/import needed.

This guide covers **optionally** exporting admin-level data from SupplySync on EC2 and importing it into your local PostgreSQL.

---

## How to run the script on EC2 (step-by-step)

If you’ve never run commands on your EC2 instance before, follow this from your **Windows PC**.

### 1. Get these from AWS

- **EC2 public IP or hostname**  
  AWS Console → EC2 → Instances → select your instance → copy “Public IPv4 address” (e.g. `3.110.123.45`).
- **SSH key file**  
  The `.pem` file you downloaded when you created the instance (e.g. `my-key.pem`). Keep it in a folder you can use in a terminal (e.g. `C:\Users\admin\.ssh\`).
- **SSH user name**  
  Usually:
  - **Amazon Linux / Amazon Linux 2:** `ec2-user`
  - **Ubuntu:** `ubuntu`
  - **Other:** check your AMI docs.

### 2. Open a terminal that can SSH

- **Option A – Windows:** Open **PowerShell** or **Command Prompt**. If `ssh` is not found, use **Option B**.
- **Option B – Windows:** Use **Windows Subsystem for Linux (WSL)** or **Git Bash** and run the same commands there.

### 3. Connect to EC2 (SSH)

In the terminal, run (replace with your values):

```bash
ssh -i "C:\path\to\your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

Example:

```bash
ssh -i "C:\Users\admin\.ssh\supplysync-key.pem" ec2-user@3.110.123.45
```

- First time you may see “Are you sure you want to continue connecting?” → type `yes` and press Enter.
- If it works, you’ll see a prompt like `[ec2-user@ip-172-31-xx-xx ~]$`. You are now **on the EC2 server**.

### 4. Find the SupplySync project on EC2

Common locations (try in order):

```bash
cd /home/ec2-user/SupplySync
# or
cd /var/www/SupplySync
# or
cd /app
# or search for it:
sudo find / -name "export_admin_data.sh" 2>/dev/null
```

Use the directory that contains `backend`, `frontend`, and `scripts`. Then:

```bash
cd /path/you/found/SupplySync
pwd
ls scripts/
```

You should see `export_admin_data.sh` listed.

### 5. Set the database password and run the export

You need the **PostgreSQL password** used on EC2 (from your backend `.env` or how you set up the DB).

**Option A – Use environment variables (recommended):**

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=supplysync
export PGPASSWORD=your_actual_db_password_here

chmod +x scripts/export_admin_data.sh
./scripts/export_admin_data.sh
```

**Option B – Pass the connection URL (no env vars):**

```bash
chmod +x scripts/export_admin_data.sh
./scripts/export_admin_data.sh "postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/supplysync"
```

Replace `YOUR_DB_PASSWORD` and `your_actual_db_password_here` with the real password.

### 6. Check the output file

```bash
ls -la supplysync_admin_data_*.sql
```

You should see a file like `supplysync_admin_data_20260314_123456.sql` in the current directory (the SupplySync folder).

### 7. Copy the file back to your Windows PC

**From a new terminal on your Windows PC** (not on EC2), run:

```powershell
scp -i "C:\path\to\your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP:/path/to/SupplySync/supplysync_admin_data_20260314_123456.sql .
```

Use the **exact path** you saw on EC2 (from `pwd` and the filename from `ls`). The `.` at the end means “current folder on my PC”.

Example (if on EC2 the file was in `/home/ec2-user/SupplySync/`):

```powershell
scp -i "C:\Users\admin\.ssh\supplysync-key.pem" ec2-user@3.110.123.45:/home/ec2-user/SupplySync/supplysync_admin_data_20260314_123456.sql .
```

After this, the `.sql` file is on your PC. You can then run the **import** steps from the section “Step 3: Import on local server” in this doc.

### If something goes wrong

| Problem | What to try |
|--------|-------------|
| `ssh` not found (Windows) | Use WSL or Git Bash, or install OpenSSH in Windows settings. |
| “Permission denied (publickey)” | Check the path to the `.pem` file and that you’re using the correct username (e.g. `ec2-user` or `ubuntu`). |
| “pg_dump: command not found” | PostgreSQL client isn’t in the PATH. Use full path, e.g. `sudo /usr/bin/pg_dump ...` or install: `sudo yum install postgresql15` (Amazon Linux) or `sudo apt install postgresql-client` (Ubuntu). |
| “connection refused” or “password authentication failed” | DB might be on another host/port. Use the same host and password as in your backend `.env` on EC2 (e.g. `PGHOST=127.0.0.1` or the RDS endpoint). |
| Script not found | Run `pwd` and `ls` on EC2 to see where you are; go to the folder that contains `scripts/export_admin_data.sh`. |

---

## What is "admin-level" data?

- **Reference tables** (admin-managed dropdowns): `body_types`, `application_types`, `surface_types`, `qualities`, `make_types`, `sizes`
- **Users** (includes admin accounts and dealers; admin manages them)

Optionally you can also export **merchants** by adding them to the export script (see below).

---

## Step 1: Export on EC2

### Option A: Using shell script (recommended)

1. **SSH into your EC2 instance** and go to the project directory.

2. **Set database connection** (use your real credentials):

   ```bash
   export PGHOST=localhost
   export PGPORT=5432
   export PGUSER=postgres
   export PGPASSWORD=your_ec2_db_password
   export PGDATABASE=supplysync
   ```

   Or use a single URL when calling the script (see below).

3. **Run the export script**:

   ```bash
   cd /path/to/SupplySync
   chmod +x scripts/export_admin_data.sh
   ./scripts/export_admin_data.sh
   ```

   With explicit URL:

   ```bash
   ./scripts/export_admin_data.sh "postgresql://postgres:YOUR_PASSWORD@localhost:5432/supplysync"
   ```

4. **Output**: A file like `supplysync_admin_data_20260314_123456.sql` is created in the project root.

### Option B: Manual pg_dump

```bash
pg_dump -h localhost -U postgres -d supplysync --data-only --no-owner --no-privileges \
  -t body_types -t application_types -t surface_types -t qualities -t make_types -t sizes -t users \
  -f supplysync_admin_data.sql
```

---

## Step 2: Transfer the file to your local machine

Choose one:

- **SCP** (from your local machine):
  ```bash
  scp -i your-key.pem ec2-user@<EC2_PUBLIC_IP>:/path/to/SupplySync/supplysync_admin_data_*.sql .
  ```

- **S3** (from EC2 upload to S3, then download locally):
  ```bash
  aws s3 cp supplysync_admin_data_20260314_123456.sql s3://your-bucket/backups/
  # Locally:
  aws s3 cp s3://your-bucket/backups/supplysync_admin_data_20260314_123456.sql .
  ```

- Or copy-paste the file via any secure channel you use.

---

## Step 3: Import on local server

1. **Ensure local DB has the schema** (tables exist). If this is a fresh local DB, run in order:
   ```bash
   cd backend
   psql -U postgres -d supplysync -f init_db.sql
   psql -U postgres -d supplysync -f schema_v2.sql
   psql -U postgres -d supplysync -f seed_data.sql
   psql -U postgres -d supplysync -f add_sizes_table.sql
   psql -U postgres -d supplysync -f add_transactions_table.sql
   psql -U postgres -d supplysync -f add_product_images_table.sql
   psql -U postgres -d supplysync -f add_activity_log_table.sql
   psql -U postgres -d supplysync -f add_subscription_admin_fields.sql
   ```

2. **Set local DB connection** (or pass URL as second argument):

   ```bash
   export PGHOST=localhost
   export PGPORT=5432
   export PGUSER=postgres
   export PGPASSWORD=postgres
   export PGDATABASE=supplysync
   ```

3. **Run the import script**:

   ```bash
   chmod +x scripts/import_admin_data.sh
   ./scripts/import_admin_data.sh supplysync_admin_data_20260314_123456.sql
   ```

   With explicit URL:

   ```bash
   ./scripts/import_admin_data.sh supplysync_admin_data_20260314_123456.sql "postgresql://postgres:postgres@localhost:5432/supplysync"
   ```

4. **Behaviour**:
   - **Reference tables** are truncated first, then data from the file is loaded. Your local reference data will match EC2.
   - **Users**: Rows from the dump are inserted. If you already have a local user with the same `id` or `email`, you may see duplicate key errors for those rows; you can ignore them if you only need the new admin users from EC2.
   - To **replace all local users** with EC2 users (including overwriting local admin), run:
     ```bash
     TRUNCATE_USERS=1 ./scripts/import_admin_data.sh supplysync_admin_data_20260314_123456.sql
     ```

---

## Windows (PowerShell) notes

- Run **export** on EC2 (Linux) as above; transfer the file to Windows.
- **Import** on Windows: use `psql` from installed PostgreSQL (or WSL):

  ```powershell
  $env:PGPASSWORD = "postgres"
  psql -h localhost -U postgres -d supplysync -f supplysync_admin_data_20260314_123456.sql
  ```

  Truncate reference tables first (in psql or a separate script) in this order: `sizes`, `make_types`, `body_types`, `application_types`, `surface_types`, `qualities`, then run the `.sql` file.

---

## Including merchants

To also transfer **merchants**, edit `scripts/export_admin_data.sh` and add `merchants` to the `TABLES` list:

```bash
TABLES="body_types application_types surface_types qualities make_types sizes users merchants"
```

Then in `scripts/import_admin_data.sh`, add before loading the dump:

```bash
TRUNCATE TABLE merchants CASCADE;
```

(Add that line in the same `run_psql` block that truncates the reference tables, or in a separate step.) Then run the import as before.

---

## Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | EC2 | Run `scripts/export_admin_data.sh` (set PG* or pass connection URL). |
| 2 | - | Transfer the generated `.sql` file to your PC (scp, S3, etc.). |
| 3 | Local | Run `scripts/import_admin_data.sh path/to/file.sql` (and optional connection URL). |

After import, log in to the admin panel locally using the same admin credentials as on EC2 (e.g. the admin user you created or the one from `add_subscription_admin_fields.sql`).
