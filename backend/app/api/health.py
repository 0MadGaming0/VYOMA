from fastapi import APIRouter
from sqlalchemy import text
from app.database.connection import engine

router = APIRouter(
    prefix="/api",
    tags=["System"]
)

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "VYOMA",
        "message": "Astronaut Health Intelligence System is running"
    }

@router.get("/health/db")
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "PostgreSQL",
            "message": "Database connection is healthy"
        }

    except Exception as e:
        return {
            "status": "error",
            "database": "PostgreSQL",
            "message": str(e)
        }