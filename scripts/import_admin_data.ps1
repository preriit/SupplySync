# Import admin-level data into local SupplySync PostgreSQL (Windows).
# Prerequisites: PostgreSQL installed, supplysync database exists with schema applied.
#
# Usage (PowerShell):
#   .\scripts\import_admin_data.ps1 -SqlFile "C:\path\to\supplysync_admin_data_20260314_123456.sql"
#   .\scripts\import_admin_data.ps1 -SqlFile ".\supplysync_admin_data.sql" -TruncateUsers
#
# Optional: -PgHost, -PgPort, -PgUser, -PgPassword, -PgDatabase (default: localhost, 5432, postgres, postgres, supplysync)

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile,
    [string]$PgHost = "localhost",
    [string]$PgPort = "5432",
    [string]$PgUser = "postgres",
    [string]$PgPassword = "postgres",
    [string]$PgDatabase = "supplysync",
    [switch]$TruncateUsers
)

if (-not (Test-Path $SqlFile)) {
    Write-Error "File not found: $SqlFile"
    exit 1
}

$env:PGPASSWORD = $PgPassword

Write-Host "Truncating reference tables..."
$truncate = "TRUNCATE TABLE sizes CASCADE; TRUNCATE TABLE make_types CASCADE; TRUNCATE TABLE body_types CASCADE; TRUNCATE TABLE application_types CASCADE; TRUNCATE TABLE surface_types CASCADE; TRUNCATE TABLE qualities CASCADE;"
& psql -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -v ON_ERROR_STOP=1 -c $truncate

if ($TruncateUsers) {
    Write-Host "Truncating users table..."
    & psql -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE users CASCADE;"
}

Write-Host "Loading data from $SqlFile..."
& psql -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -v ON_ERROR_STOP=1 -f $SqlFile

Write-Host "Import complete."
$env:PGPASSWORD = $null
