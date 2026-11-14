"""
FastAPI dependencies for authentication and authorisation.

Usage
-----
    from app.auth.dependencies import get_current_user, require_admin

    @router.get("/api/astronauts/{astronaut_id}")
    async def get_own_profile(
        astronaut_id: int,
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        ...
"""

from __future__ import annotations

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.database.connection import get_db
from app.models.astronaut import AstronautProfile


def _extract_token(request: Request) -> str | None:
    """
    Try to get the JWT from (in priority order):
    1. HttpOnly cookie ``vyoma_access_token``
    2. Authorization: Bearer <token> header
    """
    cookie_token: str | None = request.cookies.get("vyoma_access_token")
    if cookie_token:
        return cookie_token

    auth_header: str | None = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]

    return None


async def get_current_user(request: Request) -> dict:
    """
    Dependency that validates the JWT and returns its payload.

    Raises HTTP 401 for missing / invalid / expired tokens.
    Raises HTTP 401 for revoked tokens.

    Returns the decoded payload dict containing at minimum:
      ``sub``   → str(astronaut_id)
      ``email`` → email address
      ``jti``   → token id
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request)
    if not token:
        raise credentials_exception

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError):
        raise credentials_exception

    if not payload.get("sub"):
        raise credentials_exception

    return payload


def get_current_astronaut_id(
    current_user: dict = Depends(get_current_user),
) -> int:
    """Return the authenticated astronaut's PostgreSQL profile id (int)."""
    try:
        return int(current_user["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )


def require_own_astronaut(
    astronaut_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
) -> int:
    """
    Raise HTTP 403 if the requested astronaut_id differs from the token owner.
    Returns the validated astronaut_id on success.
    """
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you can only access your own records",
        )
    return astronaut_id


def require_admin(x_admin_key: str = Header(default="")) -> None:
    """
    Dependency that validates the X-Admin-Key header.
    Use on admin-only provisioning endpoints.
    """
    from app.auth.security import verify_admin_key

    if not verify_admin_key(x_admin_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin key",
        )
