"""
Authentication API router.

Endpoints
---------
POST /api/auth/login         — Exchange credentials for JWT (cookie + body)
GET  /api/auth/me            — Return authenticated user profile
POST /api/auth/logout        — Revoke JWT
POST /api/auth/provision     — Admin: create an astronaut login account
POST /api/auth/register      — Self-register astronaut account & mission profile
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_astronaut_id, require_admin
from app.auth.models import AstronautUser
from app.auth.mongodb import get_astronaut_users
from app.auth.security import (
    create_access_token,
    hash_password,
    revoke_token,
    verify_password,
    JWT_EXPIRE_MINUTES,
)
from app.database.connection import get_db
from app.models.astronaut import AstronautProfile
from app.models.vital import VitalReading

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Cookie flags
_SECURE_COOKIES = os.environ.get("SECURE_COOKIES", "false").lower() == "true"


# ── Request / Response schemas ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Accept either email or astronaut_code as the identifier, or username for legacy clients."""
    identifier: str | None = None
    username: str | None = None
    email: str | None = None
    password: str = Field(min_length=1)

    def get_identifier(self) -> str:
        raw = self.identifier or self.username or self.email
        if not raw or not raw.strip():
            raise _GENERIC_AUTH_ERROR
        return raw.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    astronaut_id: int
    email: str
    name: str


class MeResponse(BaseModel):
    astronaut_id: int
    email: str
    name: str
    astronaut_code: str
    age: int | None
    mission_id: str | None
    is_active: bool


class ProvisionRequest(BaseModel):
    astronaut_id: int = Field(gt=0)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def email_lower(cls, v: str) -> str:
        return v.strip().lower()


class ProvisionResponse(BaseModel):
    message: str
    astronaut_id: int
    email: str


class RegisterRequest(BaseModel):
    """
    Self-registration for astronauts.
    If astronaut_code is omitted, the next sequential code (e.g. AST-003) is auto-assigned.
    If astronaut_code is provided and does not exist in PostgreSQL, the profile is created automatically.
    """
    astronaut_code: str | None = Field(
        default=None,
        max_length=50,
        description="Assigned or preferred astronaut code (e.g. AST-003). Auto-assigned if omitted.",
    )
    name: str | None = Field(default=None, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def email_lower(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("astronaut_code")
    @classmethod
    def clean_code(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip().upper()
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ── Helpers ───────────────────────────────────────────────────────────────────

_GENERIC_AUTH_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
)

def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="vyoma_access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=_SECURE_COOKIES,
        max_age=JWT_EXPIRE_MINUTES * 60,
        path="/",
    )

def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="vyoma_access_token", path="/")


async def _find_user_by_identifier(identifier: str) -> AstronautUser | None:
    """
    Look up an AstronautUser by email (exact, lowercase) or by linking
    the identifier to an astronaut_code in PostgreSQL.
    """
    col = get_astronaut_users()
    identifier = identifier.strip()
    lower = identifier.lower()

    # 1. Try as email
    doc = await col.find_one({"email": lower})
    if doc:
        return AstronautUser.from_mongo(doc)

    return None


async def _find_user_by_astronaut_id(astronaut_id: int) -> AstronautUser | None:
    col = get_astronaut_users()
    doc = await col.find_one({"astronaut_id": astronaut_id})
    return AstronautUser.from_mongo(doc)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with email (or astronaut_code) + password.

    Returns a JWT access token in the response body AND sets it as an
    HttpOnly cookie. Generic 401 is returned for any credential failure
    to avoid leaking which field was wrong.
    """
    identifier = body.get_identifier()
    lower_id = identifier.lower()

    # 1. Resolve to an AstronautUser document
    col = get_astronaut_users()

    # Try email first
    doc = await col.find_one({"email": lower_id})

    # Fallback: treat identifier as astronaut_code, look up pg profile then mongo
    if doc is None:
        pg_astronaut = (
            db.query(AstronautProfile)
            .filter(func.upper(AstronautProfile.astronaut_code) == identifier.upper())
            .first()
        )
        if pg_astronaut:
            doc = await col.find_one({"astronaut_id": pg_astronaut.id})

    if doc is None:
        raise _GENERIC_AUTH_ERROR

    user = AstronautUser.from_mongo(doc)

    # 2. Verify password
    if not verify_password(body.password, user.password_hash):
        raise _GENERIC_AUTH_ERROR

    # 3. Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact your mission administrator.",
        )

    # 4. Load PostgreSQL profile
    pg_astronaut = db.get(AstronautProfile, user.astronaut_id)
    if pg_astronaut is None:
        raise _GENERIC_AUTH_ERROR

    # 5. Issue JWT
    token = create_access_token(
        astronaut_id=user.astronaut_id,
        email=user.email,
    )

    _set_auth_cookie(response, token)

    return TokenResponse(
        access_token=token,
        astronaut_id=user.astronaut_id,
        email=user.email,
        name=pg_astronaut.name,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Self-registration for astronauts.

    - If astronaut_code is provided and exists in PostgreSQL, links to it (if not already claimed).
    - If astronaut_code is provided and DOES NOT exist in PostgreSQL, creates the profile automatically.
    - If astronaut_code is omitted, auto-generates the next sequential code (e.g. AST-003) and creates profile.
    - Initializes baseline vital readings for smooth telemetry dashboard operation.
    - Creates MongoDB authentication record with hashed password.
    - Auto-logs in the user (returns JWT + sets HttpOnly cookie).
    """
    col = get_astronaut_users()

    # 1. Verify email is not already taken in MongoDB
    existing_by_email = await col.find_one({"email": body.email})
    if existing_by_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email address.",
        )

    # Helper: generate derived name from email
    email_prefix = body.email.split("@")[0]
    cleaned_name = " ".join(
        part.capitalize() for part in re.split(r"[._\-+]+", email_prefix) if part
    )

    # 2. Resolve or provision PostgreSQL AstronautProfile
    code = body.astronaut_code
    if code:
        # Check if code already exists in PostgreSQL
        pg_astronaut = (
            db.query(AstronautProfile)
            .filter(func.upper(AstronautProfile.astronaut_code) == code)
            .first()
        )
        if pg_astronaut:
            # Check if this profile is already claimed by another MongoDB account
            linked = await col.find_one({"astronaut_id": pg_astronaut.id})
            if linked:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account is already linked to astronaut code {code}.",
                )
        else:
            # Code does NOT exist in PostgreSQL yet -> Auto-create profile!
            display_name = (body.name or "").strip() or cleaned_name or f"Astronaut {code}"
            pg_astronaut = AstronautProfile(
                astronaut_code=code,
                name=display_name,
                mission_id="MISSION-2026",
            )
            db.add(pg_astronaut)
            db.commit()
            db.refresh(pg_astronaut)

            # Baseline vital metrics for the new astronaut
            baseline_vital = VitalReading(
                astronaut_id=pg_astronaut.id,
                heart_rate=72.0,
                hrv=55.0,
                spo2=98.5,
                systolic_bp=120,
                diastolic_bp=80,
                body_temperature=36.8,
                respiratory_rate=14.0,
            )
            db.add(baseline_vital)
            db.commit()
    else:
        # Auto-generate next code: AST-003, AST-004...
        existing_codes = [p.astronaut_code for p in db.query(AstronautProfile.astronaut_code).all()]
        nums = []
        for c in existing_codes:
            m = re.search(r"AST-(\d+)", c, re.IGNORECASE)
            if m:
                nums.append(int(m.group(1)))
        next_num = (max(nums) + 1) if nums else 1
        generated_code = f"AST-{next_num:03d}"

        display_name = (body.name or "").strip() or cleaned_name or f"Astronaut {generated_code}"

        pg_astronaut = AstronautProfile(
            astronaut_code=generated_code,
            name=display_name,
            mission_id="MISSION-2026",
        )
        db.add(pg_astronaut)
        db.commit()
        db.refresh(pg_astronaut)

        # Baseline vitals
        baseline_vital = VitalReading(
            astronaut_id=pg_astronaut.id,
            heart_rate=72.0,
            hrv=55.0,
            spo2=98.5,
            systolic_bp=120,
            diastolic_bp=80,
            body_temperature=36.8,
            respiratory_rate=14.0,
        )
        db.add(baseline_vital)
        db.commit()

    # 3. Create MongoDB auth record
    user = AstronautUser(
        astronaut_id=pg_astronaut.id,
        email=body.email,
        password_hash=hash_password(body.password),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    try:
        await col.insert_one(user.to_mongo())
    except Exception as exc:
        err = str(exc).lower()
        if "duplicate" in err or "e11000" in err:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account already exists.",
            )
        raise HTTPException(status_code=500, detail="Failed to create account")

    # 4. Auto-login: issue JWT + set HttpOnly cookie
    token = create_access_token(astronaut_id=pg_astronaut.id, email=body.email)
    _set_auth_cookie(response, token)

    return TokenResponse(
        access_token=token,
        astronaut_id=pg_astronaut.id,
        email=body.email,
        name=pg_astronaut.name,
    )


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeResponse:
    """
    Return the authenticated astronaut's public profile.
    Password hash is never included.
    """
    astronaut_id = int(current_user["sub"])

    pg_astronaut = db.get(AstronautProfile, astronaut_id)
    if pg_astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut profile not found")

    mongo_user = await _find_user_by_astronaut_id(astronaut_id)
    if mongo_user is None:
        raise HTTPException(status_code=404, detail="Auth record not found")

    return MeResponse(
        astronaut_id=astronaut_id,
        email=mongo_user.email,
        name=pg_astronaut.name,
        astronaut_code=pg_astronaut.astronaut_code,
        age=pg_astronaut.age,
        mission_id=pg_astronaut.mission_id,
        is_active=mongo_user.is_active,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Revoke the current JWT and clear the auth cookie.

    The token's jti is added to the in-memory revocation set so that
    the same token cannot be reused until process restart.
    """
    from app.auth.dependencies import _extract_token
    token = _extract_token(request)
    if token:
        revoke_token(token)

    _clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@router.post(
    "/provision",
    response_model=ProvisionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def provision_account(
    body: ProvisionRequest,
    db: Session = Depends(get_db),
) -> ProvisionResponse:
    """
    Admin-only: create a login account for an existing PostgreSQL astronaut.

    Requires header: ``X-Admin-Key: <value-of-ADMIN_KEY-env-var>``
    """
    # 1. Verify PostgreSQL astronaut exists
    pg_astronaut = db.get(AstronautProfile, body.astronaut_id)
    if pg_astronaut is None:
        raise HTTPException(
            status_code=404,
            detail=f"No astronaut profile found with id={body.astronaut_id}",
        )

    # 2. Create the MongoDB document
    user = AstronautUser(
        astronaut_id=body.astronaut_id,
        email=body.email,
        password_hash=hash_password(body.password),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    col = get_astronaut_users()
    try:
        await col.insert_one(user.to_mongo())
    except Exception as exc:
        err = str(exc).lower()
        if "duplicate" in err or "e11000" in err:
            raise HTTPException(
                status_code=409,
                detail="An account with this email or astronaut_id already exists",
            )
        raise HTTPException(status_code=500, detail="Failed to create account")

    return ProvisionResponse(
        message="Account created successfully",
        astronaut_id=body.astronaut_id,
        email=body.email,
    )
