from app.services.alert_engine import evaluate_vital_reading
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.connection import get_db
from app.models.vital import VitalReading
from app.models.astronaut import AstronautProfile
from app.schemas.vital import (
    VitalReadingCreate,
    VitalReadingResponse
)
from app.auth.dependencies import get_current_astronaut_id, require_admin, _extract_token
from app.auth.security import decode_access_token, verify_admin_key

router = APIRouter(
    prefix="/api/vitals",
    tags=["VitalWatch"]
)


# CREATE — Submit a vital reading for the authenticated astronaut
@router.post("/", response_model=VitalReadingResponse, status_code=201)
def create_vital_reading(
    reading: VitalReadingCreate,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    # Enforce: astronaut_id in body must match the authenticated user
    if reading.astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only submit readings for your own profile",
        )

    try:
        astronaut = db.get(AstronautProfile, reading.astronaut_id)
        if astronaut is None:
            raise HTTPException(status_code=404, detail="Astronaut not found")

        new_reading = VitalReading(**reading.model_dump())
        db.add(new_reading)
        db.flush()
        evaluate_vital_reading(new_reading, db)
        db.commit()
        db.refresh(new_reading)
        return new_reading

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save vital reading")


# READ — Retrieve readings for the authenticated astronaut
@router.get(
    "/astronaut/{astronaut_id}",
    response_model=list[VitalReadingResponse]
)
def get_astronaut_vitals(
    astronaut_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own vital readings",
        )

    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    statement = (
        select(VitalReading)
        .where(VitalReading.astronaut_id == astronaut_id)
        .order_by(VitalReading.recorded_at.desc())
    )
    return db.execute(statement).scalars().all()


# HISTORY — Retrieve readings within a time range (own only)
@router.get(
    "/astronaut/{astronaut_id}/history",
    response_model=list[VitalReadingResponse]
)
def get_astronaut_vital_history(
    astronaut_id: int,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own vital history",
        )

    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    if start_time and end_time and start_time > end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    statement = select(VitalReading).where(VitalReading.astronaut_id == astronaut_id)

    if start_time:
        statement = statement.where(VitalReading.recorded_at >= start_time)
    if end_time:
        statement = statement.where(VitalReading.recorded_at <= end_time)

    statement = statement.order_by(VitalReading.recorded_at.asc()).limit(limit)
    return db.execute(statement).scalars().all()


# SUMMARY — Vital statistics dashboard (own only)
@router.get("/astronaut/{astronaut_id}/summary")
def get_astronaut_vital_summary(
    astronaut_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own vital summary",
        )

    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    statement = select(
        func.count(VitalReading.id),
        func.avg(VitalReading.heart_rate),
        func.avg(VitalReading.hrv),
        func.avg(VitalReading.spo2),
        func.avg(VitalReading.body_temperature),
        func.avg(VitalReading.respiratory_rate),
        func.avg(VitalReading.systolic_bp),
        func.avg(VitalReading.diastolic_bp)
    ).where(VitalReading.astronaut_id == astronaut_id)

    result = db.execute(statement).one()

    latest_reading = db.execute(
        select(VitalReading)
        .where(VitalReading.astronaut_id == astronaut_id)
        .order_by(VitalReading.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    return {
        "astronaut_id": astronaut_id,
        "astronaut_name": astronaut.name,
        "total_readings": result[0],
        "averages": {
            "heart_rate": round(float(result[1]), 2) if result[1] is not None else None,
            "hrv": round(float(result[2]), 2) if result[2] is not None else None,
            "spo2": round(float(result[3]), 2) if result[3] is not None else None,
            "body_temperature": round(float(result[4]), 2) if result[4] is not None else None,
            "respiratory_rate": round(float(result[5]), 2) if result[5] is not None else None,
            "systolic_bp": round(float(result[6]), 2) if result[6] is not None else None,
            "diastolic_bp": round(float(result[7]), 2) if result[7] is not None else None,
        },
        "latest_reading": latest_reading,
    }


# READ one reading (own only)
@router.get("/{reading_id}", response_model=VitalReadingResponse)
def get_vital_reading(
    reading_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    reading = db.get(VitalReading, reading_id)
    if reading is None:
        raise HTTPException(status_code=404, detail="Vital reading not found")
    if reading.astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own vital readings",
        )
    return reading


# READ vital readings — admin returns all, astronaut returns own readings only
@router.get("/", response_model=list[VitalReadingResponse])
def get_vital_readings(
    request: Request,
    db: Session = Depends(get_db),
):
    admin_key = request.headers.get("X-Admin-Key", "")
    if admin_key and verify_admin_key(admin_key):
        statement = select(VitalReading).order_by(VitalReading.recorded_at.desc())
        return db.execute(statement).scalars().all()

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        ast_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    statement = select(VitalReading).where(
        VitalReading.astronaut_id == ast_id
    ).order_by(VitalReading.recorded_at.desc())
    return db.execute(statement).scalars().all()


# DELETE — admin only
@router.delete("/{reading_id}", dependencies=[Depends(require_admin)])
def delete_vital_reading(reading_id: int, db: Session = Depends(get_db)):
    reading = db.get(VitalReading, reading_id)
    if reading is None:
        raise HTTPException(status_code=404, detail="Vital reading not found")
    db.delete(reading)
    db.commit()
    return {"message": "Vital reading deleted successfully", "reading_id": reading_id}
