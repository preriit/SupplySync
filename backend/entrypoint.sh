#!/bin/sh
set -e
echo "Waiting for PostgreSQL..."
until python -c "
import os
from sqlalchemy import create_engine
engine = create_engine(os.environ.get('DATABASE_URL',''))
conn = engine.connect()
conn.close()
" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is up."
python run_schema.py || true
exec uvicorn server:app --host 0.0.0.0 --port 8001
