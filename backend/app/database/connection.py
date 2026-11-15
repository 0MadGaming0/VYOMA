
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve project directories
BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

# Load environment variables following Neon agent skills precedence:
# 1. Project root .env.local (written by `neon deploy` / `neon env pull`)
# 2. Backend .env.local
# 3. Project root .env
# 4. Backend .env
for env_file in [
    PROJECT_ROOT / ".env.local",
    BACKEND_DIR / ".env.local",
    PROJECT_ROOT / ".env",
    BACKEND_DIR / ".env",
]:
    if env_file.is_file():
        load_dotenv(env_file, override=False)

# Read PostgreSQL connection URLs
# DATABASE_URL is the pooled connection (used by web APIs & serverless compute)
DATABASE_URL = os.getenv("DATABASE_URL")
# DATABASE_URL_UNPOOLED is the direct connection (used for DDL / migrations / admin)
DATABASE_URL_UNPOOLED = os.getenv("DATABASE_URL_UNPOOLED", DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from environment (.env.local or .env)")

# Create SQLAlchemy engine configured for Neon Lakebase Postgres:
# - pool_pre_ping=True: detects suspended/reconnected serverless endpoints before queries
# - pool_recycle=300: recycles pooled connections every 5 minutes to prevent stale PgBouncer handles
# - pool_size & max_overflow: tuned for pooled serverless concurrency
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
)

# Create database session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

# Provide a database session to API endpoints
def get_db():
    with SessionLocal() as db:
        yield db
