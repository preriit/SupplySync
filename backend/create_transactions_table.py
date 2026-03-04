"""Create product_transactions table"""
from database import engine, Base
from models import ProductTransaction

# Create the table
Base.metadata.create_all(bind=engine, tables=[ProductTransaction.__table__])
print("✅ Product transactions table created successfully")
