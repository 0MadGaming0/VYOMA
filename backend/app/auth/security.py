"""
Password hashing (bcrypt) and JWT token utilities.

Environment variables read
--------------------------
JWT_SECRET          : HMAC-SHA256 signing key (required)
JWT_ALGORITHM       : default HS256
JWT_EXPIRE_MINUTES  : token lifetime, default 60
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import bcrypt
import jwt
from dotenv import load_dotenv

# Load .env from backend root (backend/.env)
# File: backend/app/auth/security.py → parents[2] = backend/
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=False)

JWT_SECRET: str = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))
ADMIN_KEY: str = os.environ.get("ADMIN_KEY", "")

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET is not set in .env — set a random 256-bit hex string."
    )

# ── In-memory revocation set (jti strings) ──────────────────────────────────
# Cleared on process restart; acceptable for MVP / single-instance deployment.
_revoked_jtis: set[str] = set()


# ── Password utilities ───────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash (12 rounds)."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time bcrypt comparison.  Returns False on any error."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT utilities ────────────────────────────────────────────────────────────

def create_access_token(
    *,
    astronaut_id: int,
    email: str,
    extra: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Claims
    ------
    sub  : str(astronaut_id)   — subject (always the PG profile id)
    email: email address
    jti  : unique token id     — used for revocation
    iat  : issued-at
    exp  : expiry
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(astronaut_id),
        "email": email,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises
    ------
    jwt.ExpiredSignatureError   : token has expired
    jwt.InvalidTokenError       : any other invalid-token condition
    ValueError                  : token has been revoked
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    jti: str = payload.get("jti", "")
    if jti in _revoked_jtis:
        raise ValueError("Token has been revoked")
    return payload


def revoke_token(token: str) -> None:
    """Add token's jti to the in-memory revocation set."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": False},  # revoke even if already expired
        )
        jti = payload.get("jti")
        if jti:
            _revoked_jtis.add(jti)
    except Exception:
        pass  # malformed token — nothing to revoke


# ── Admin-key verification ───────────────────────────────────────────────────

def verify_admin_key(provided: str) -> bool:
    """Constant-time comparison of the provided key against ADMIN_KEY env var."""
    if not ADMIN_KEY:
        return False
    return hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(),
        hashlib.sha256(ADMIN_KEY.encode()).digest(),
    )
