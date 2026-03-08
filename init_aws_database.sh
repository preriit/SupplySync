#!/bin/bash
# Database Initialization Script for AWS RDS

# Usage: ./init_aws_database.sh <RDS_ENDPOINT> <PASSWORD>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./init_aws_database.sh <RDS_ENDPOINT> <PASSWORD>"
    echo "Example: ./init_aws_database.sh mydb.xxxxx.us-east-1.rds.amazonaws.com mypassword"
    exit 1
fi

RDS_ENDPOINT=$1
PASSWORD=$2

echo "🗄️  Initializing SupplySync Database on AWS RDS"
echo "==============================================="

# Create database if not exists
echo "📊 Creating database..."
PGPASSWORD=$PASSWORD psql -h $RDS_ENDPOINT -U postgres -d postgres -c "CREATE DATABASE IF NOT EXISTS supplysync;" 2>/dev/null || echo "Database may already exist"

# Run migrations (create tables)
echo "📋 Creating tables..."
cd /home/ubuntu/your-repo/backend
source venv/bin/activate

python3 -c "
from database import engine
from models import Base

Base.metadata.create_all(bind=engine)
print('✅ All database tables created successfully')
"

# Create admin user
echo "👤 Creating admin user..."
python3 -c "
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()
try:
    existing = db.query(User).filter(User.email == 'admin@supplysync.com').first()
    if not existing:
        admin = User(
            username='admin',
            email='admin@supplysync.com',
            phone='0000000000',
            password_hash=get_password_hash('password'),
            user_type='admin',
            role='super_admin',
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
        print('✅ Admin user created')
    else:
        print('ℹ️  Admin user already exists')
finally:
    db.close()
"

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "Admin credentials:"
echo "  Username: admin"
echo "  Password: password"
echo ""
echo "You can now access the admin panel at: /admin/login"
