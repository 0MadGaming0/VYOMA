"""
Pydantic document model for the ``astronaut_users`` MongoDB collection.

Intentionally minimal — astronaut profile data lives in PostgreSQL.
This document only holds authentication credentials and a foreign-key
reference (``astronaut_id``) to the ``astronaut_profiles`` table.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PyObjectId(str):
    """Custom type that round-trips a MongoDB ObjectId as a plain string."""

    @classmethod
    def __get_validators__(cls):  # pydantic v1 compat (not used for v2 below)
        yield cls.validate

    @classmethod
    def validate(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError(f"Invalid ObjectId: {v!r}")

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)


class AstronautUser(BaseModel):
    """
    MongoDB document stored in ``astronaut_users``.

    Fields
    ------
    id              : MongoDB _id serialised as a string (omitted on creation)
    astronaut_id    : FK → PostgreSQL astronaut_profiles.id
    email           : unique login credential
    password_hash   : bcrypt hash — NEVER returned via API
    is_active       : disabled accounts cannot log in
    created_at      : UTC timestamp set at document creation
    """

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId | None = Field(default=None, alias="_id")
    astronaut_id: int
    email: str  # validated as email at the API schema layer
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def to_mongo(self) -> dict:
        """Serialise to a dict ready for pymongo/motor insert."""
        data = self.model_dump(by_alias=False, exclude={"id"})
        return data

    @classmethod
    def from_mongo(cls, doc: dict | None) -> "AstronautUser | None":
        """Deserialise from a MongoDB document dict."""
        if doc is None:
            return None
        doc = dict(doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return cls.model_validate(doc)
