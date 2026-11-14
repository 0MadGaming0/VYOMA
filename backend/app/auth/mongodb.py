"""
MongoDB connection and collection accessors for VYOMA authentication.

Uses motor (async MongoDB driver).  The client is opened once on FastAPI
startup and closed on shutdown via the lifespan context in main.py.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

import motor.motor_asyncio
from dotenv import load_dotenv
from pymongo import ASCENDING

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorCollection

# Load environment from backend/.env
# File: backend/app/auth/mongodb.py → parents[2] = backend/
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=False)

MONGO_URL: str = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
MONGO_DB: str = os.environ.get("MONGO_DB", "vyoma_auth")

# Single Motor client (created on first import, re-used across requests)
_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


def get_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    return get_client()[MONGO_DB]


def get_astronaut_users() -> AsyncIOMotorCollection:
    """Return the ``astronaut_users`` collection."""
    return get_db()["astronaut_users"]


async def close_client() -> None:
    """Call this on application shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ensure_indexes() -> None:
    """
    Create unique indexes on ``email`` and ``astronaut_id``.
    Safe to call multiple times — MongoDB ignores duplicates.
    """
    col = get_astronaut_users()
    await col.create_index([("email", ASCENDING)], unique=True, name="idx_email_unique")
    await col.create_index(
        [("astronaut_id", ASCENDING)],
        unique=True,
        name="idx_astronaut_id_unique",
    )
