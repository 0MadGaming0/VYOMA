from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import engine
from app.database.base import Base
import app.models  # Ensure all SQLAlchemy models are registered on Base.metadata

from app.api.health import router as health_router
from app.api.astronauts import router as astronaut_router
from app.api.vitals import router as vitals_router
from app.api.alerts import router as alerts_router
from app.api.assistant import router as assistant_router
from app.auth.router import router as auth_router
from app.auth.mongodb import ensure_indexes, close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure PostgreSQL tables exist without modifying existing data
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[VYOMA API] Warning: Could not auto-create database tables on startup: {e}")

    # Initialise MongoDB indexes for the astronaut_users collection
    try:
        await ensure_indexes()
        print("[VYOMA API] MongoDB indexes ensured on astronaut_users")
    except Exception as e:
        print(f"[VYOMA API] Warning: MongoDB index setup failed: {e}")

    yield

    # Clean up Motor connection on shutdown
    await close_client()


app = FastAPI(
    title="VYOMA API",
    description="Astronaut Health Intelligence System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(health_router)
app.include_router(astronaut_router)
app.include_router(vitals_router)
app.include_router(alerts_router)
app.include_router(assistant_router)


@app.get("/")
def root():
    return {
        "project": "VYOMA",
        "status": "operational"
    }
