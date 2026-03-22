"""
Create or reset the default admin user using the same DB and password hashing as the app.
Run from the backend folder: python ensure_admin.py

Usage: python ensure_admin.py [password]
  Default password is 'password'. Or pass one argument: python ensure_admin.py mysecret
"""
import os
import sys
from pathlib import Path

# Load .env from backend folder
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from database import SessionLocal
from models import User
from auth import get_password_hash

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@supplysync.com"
DEFAULT_PASSWORD = "password"

def main():
    password = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PASSWORD
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.user_type == "admin").all()
        print(f"Found {len(existing)} admin user(s):", [u.username for u in existing])

        user = db.query(User).filter(
            (User.username == ADMIN_USERNAME) | (User.email == ADMIN_EMAIL)
        ).first()

        if user:
            user.password_hash = get_password_hash(password)
            user.user_type = "admin"
            user.role = "super_admin"
            user.is_active = True
            user.is_verified = True
            db.commit()
            print(f"Updated admin user: username={user.username}, email={user.email}")
        else:
            user = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                phone="0000000000",
                password_hash=get_password_hash(password),
                user_type="admin",
                role="super_admin",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            print(f"Created admin user: username={user.username}, email={user.email}")

        print(f"\nLogin at http://localhost:3000/admin/login with:")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Password: {password}")
    except Exception as e:
        db.rollback()
        print("Error:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
