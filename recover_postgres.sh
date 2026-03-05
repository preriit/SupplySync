#!/bin/bash
# PostgreSQL Recovery Script for SupplySync
# Run this script if database connection fails

echo "🔄 PostgreSQL Recovery Script"
echo "=============================="

# 1. Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    apt-get update && apt-get install -y postgresql postgresql-contrib
fi

# 2. Start PostgreSQL service
echo "🚀 Starting PostgreSQL..."
service postgresql start
sleep 2

# 3. Check status
if service postgresql status | grep -q "online"; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

# 4. Ensure database exists
echo "📊 Checking database..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw supplysync
if [ $? -ne 0 ]; then
    echo "Creating supplysync database..."
    sudo -u postgres psql -c "CREATE DATABASE supplysync;"
fi

# 5. Set postgres password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" > /dev/null 2>&1

# 6. Create tables if needed
echo "📋 Creating tables..."
cd /app/backend
python3 -c "
from database import engine
from models import Base
Base.metadata.create_all(bind=engine)
print('✅ Database tables ready')
"

# 7. Restart backend to reconnect
echo "🔄 Restarting backend..."
supervisorctl restart backend
sleep 2

echo ""
echo "✅ PostgreSQL Recovery Complete!"
echo "================================"
echo "You can now log in with:"
echo "Email: dealer@supplysync.com"
echo "Password: password123"
