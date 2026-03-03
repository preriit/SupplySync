"""
Apply schema and seed data to PostgreSQL database
"""
import sys
sys.path.append('/app/backend')

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

DATABASE_URL = os.environ.get('DATABASE_URL')

def execute_sql_file(engine, filepath):
    """Execute SQL file"""
    with open(filepath, 'r') as f:
        sql = f.read()
    
    with engine.connect() as conn:
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip()]
        for statement in statements:
            try:
                conn.execute(text(statement))
                conn.commit()
            except Exception as e:
                print(f"Error executing statement: {str(e)[:200]}")
                print(f"Statement: {statement[:200]}...")
                # Continue with other statements
        print(f"✅ Executed {len(statements)} statements from {filepath}")

def main():
    print(f"Connecting to: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    print("\n📋 Applying schema...")
    execute_sql_file(engine, '/app/backend/schema_v2.sql')
    
    print("\n🌱 Seeding reference data...")
    execute_sql_file(engine, '/app/backend/seed_data.sql')
    
    print("\n✅ Database setup complete!")
    
    # Verify
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM make_types"))
        count = result.scalar()
        print(f"\n✓ Make Types count: {count}")
        
        result = conn.execute(text("SELECT name FROM categories"))
        categories = [row[0] for row in result]
        print(f"✓ Categories: {categories}")

if __name__ == "__main__":
    main()
