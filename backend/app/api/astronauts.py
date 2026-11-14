from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.schemas.astronaut import AstronautUpdate

from app.database.connection import get_db
from app.models.astronaut import AstronautProfile
from app.schemas.astronaut import AstronautCreate, AstronautResponse
from app.auth.dependencies import get_current_astronaut_id, require_own_astronaut, require_admin, _extract_token
from app.auth.security import decode_access_token, verify_admin_key


router = APIRouter(
    prefix="/api/astronauts",
    tags=["Astronauts"]
)


# READ — Retrieve own astronaut profile (authenticated)
@router.get("/me", response_model=AstronautResponse)
def get_my_profile(
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    astronaut = db.get(AstronautProfile, current_astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    return astronaut


# READ — Retrieve one astronaut by ID (must be own profile)
@router.get("/{astronaut_id}", response_model=AstronautResponse)
def get_astronaut(
    astronaut_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only access your own profile",
        )
    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    return astronaut


# UPDATE — Modify own astronaut profile
@router.put("/{astronaut_id}", response_model=AstronautResponse)
def update_astronaut(
    astronaut_id: int,
    astronaut_data: AstronautUpdate,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only update your own profile",
        )

    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    update_data = astronaut_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(astronaut, field, value)

    try:
        db.commit()
        db.refresh(astronaut)
        return astronaut
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update astronaut")


# ── Admin-only endpoints ──────────────────────────────────────────────────────

# CREATE — Register a new astronaut profile (admin only)
@router.post("/", response_model=AstronautResponse, status_code=201,
             dependencies=[Depends(require_admin)])
def create_astronaut(
    astronaut: AstronautCreate,
    db: Session = Depends(get_db),
):
    new_astronaut = AstronautProfile(
        astronaut_code=astronaut.astronaut_code,
        name=astronaut.name,
        age=astronaut.age,
        mission_id=astronaut.mission_id,
    )

    try:
        db.add(new_astronaut)
        db.commit()
        db.refresh(new_astronaut)
        return new_astronaut
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Astronaut code already exists")


# READ — Retrieve astronauts (admin returns all, astronaut returns only own profile)
@router.get("/", response_model=list[AstronautResponse])
def get_astronauts(
    request: Request,
    db: Session = Depends(get_db),
):
    admin_key = request.headers.get("X-Admin-Key", "")
    if admin_key and verify_admin_key(admin_key):
        statement = select(AstronautProfile).order_by(AstronautProfile.id)
        return db.execute(statement).scalars().all()

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        ast_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    astronaut = db.get(AstronautProfile, ast_id)
    if not astronaut:
        return []
    return [astronaut]


# DELETE — Remove an astronaut profile (admin only)
@router.delete("/{astronaut_id}", dependencies=[Depends(require_admin)])
def delete_astronaut(
    astronaut_id: int,
    db: Session = Depends(get_db),
):
    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    db.delete(astronaut)
    db.commit()
    return {"message": "Astronaut deleted successfully", "astronaut_id": astronaut_id}
