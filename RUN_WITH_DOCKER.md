# Run SupplySync with Docker (recommended)

One command to run the whole app—no local Node, Python, or PostgreSQL setup required.

## Prerequisites

- **Docker Desktop** installed and running ([download](https://www.docker.com/products/docker-desktop/)).

## Run the app

From the project root (folder that contains `backend`, `frontend`, `docker-compose.yml`):

```powershell
docker-compose up --build
```

First time will build images and start Postgres, backend, and frontend. Wait until you see the backend and frontend logs (e.g. "Uvicorn running", "Compiled successfully").

Then open in your browser:

- **App:** http://localhost:3000  
- **Admin login:** http://localhost:3000/admin/login  

Default admin (after schema runs): username **admin**, password **password** (from `add_subscription_admin_fields.sql`). If you already imported your EC2 data, use those credentials instead.

## Stop

Press `Ctrl+C` in the terminal, then:

```powershell
docker-compose down
```

To also remove the database volume (fresh DB next time):

```powershell
docker-compose down -v
```

## Import your EC2 admin data (optional)

If you have an exported SQL file (e.g. `admin_data_export.sql`):

1. Start the stack: `docker-compose up -d`
2. Copy the file into the DB container and load it:

   ```powershell
   docker cp C:\path\to\admin_data_export.sql supplysync-db-1:/tmp/
   docker-compose exec db psql -U postgres -d supplysync -f /tmp/admin_data_export.sql
   ```

   (Container name may vary; use `docker-compose ps` to see the exact name. It might be `supplysync-db-1` or `supplysync_db_1`.)

3. Or run the truncate + import from your PC using the exposed port:

   ```powershell
   $env:PGPASSWORD = "postgres"
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5432 -U postgres -d supplysync -c "TRUNCATE TABLE sizes CASCADE; TRUNCATE TABLE make_types CASCADE; TRUNCATE TABLE body_types CASCADE; TRUNCATE TABLE application_types CASCADE; TRUNCATE TABLE surface_types CASCADE; TRUNCATE TABLE qualities CASCADE;"
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 5432 -U postgres -d supplysync -f "C:\path\to\admin_data_export.sql"
   ```

   (With Docker Compose, Postgres is on port 5432 on your machine.)

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Port 3000 or 8001 already in use | Stop the other app using that port, or change the port in `docker-compose.yml` (e.g. `"3001:3000"` for frontend). |
| Frontend build fails (e.g. ajv) | The project uses an `overrides` in `package.json`. If it still fails, we can switch the frontend to Vite (see below). |
| Backend "module not found" | The Docker build uses `requirements-docker.txt` (no Emergent packages). If you need an extra package, add it there and rebuild. |
| DB connection refused | Wait a bit longer; Postgres starts first and the backend waits for it. Use `docker-compose logs db` to check. |

## If you prefer not to use Docker

Use the same backend and frontend as before, but run everything locally (see README). The Docker setup is there so you can avoid the repeated local setup issues.
