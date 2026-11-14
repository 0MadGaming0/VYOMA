from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.connection import get_db
from app.models.alert import HealthAlert
from app.models.astronaut import AstronautProfile
from app.schemas.alert import (
    AlertResponse,
    AlertStatusUpdate,
    AlertListResponse
)
from app.auth.dependencies import get_current_astronaut_id, require_admin


router = APIRouter(
    prefix="/api/alerts",
    tags=["Alert Management"]
)


# GET — Retrieve alerts for the authenticated astronaut (filtered to own)
@router.get("/", response_model=AlertListResponse)
def get_my_alerts(
    status: str | None = None,
    severity: str | None = None,
    metric: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    """Return alerts belonging to the authenticated astronaut only."""
    statement = select(HealthAlert).where(
        HealthAlert.astronaut_id == current_astronaut_id
    )

    if status:
        statement = statement.where(HealthAlert.status == status.upper())
    if severity:
        statement = statement.where(HealthAlert.severity == severity.upper())
    if metric:
        statement = statement.where(HealthAlert.metric == metric.lower())

    count_statement = select(func.count()).select_from(statement.subquery())
    total = db.execute(count_statement).scalar_one()

    statement = (
        statement
        .order_by(HealthAlert.created_at.desc(), HealthAlert.id.desc())
        .offset(skip)
        .limit(limit)
    )
    alerts = db.execute(statement).scalars().all()

    return {"alerts": alerts, "total": total, "skip": skip, "limit": limit}


# GET — Retrieve one alert (must belong to authenticated astronaut)
@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    alert = db.get(HealthAlert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own alerts",
        )
    return alert


# GET — Retrieve alerts for a specific astronaut_id (must be own)
@router.get(
    "/astronaut/{astronaut_id}",
    response_model=list[AlertResponse]
)
def get_astronaut_alerts(
    astronaut_id: int,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    if astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only view your own alerts",
        )

    astronaut = db.get(AstronautProfile, astronaut_id)
    if astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")

    statement = (
        select(HealthAlert)
        .where(HealthAlert.astronaut_id == astronaut_id)
        .order_by(HealthAlert.created_at.desc())
    )
    return db.execute(statement).scalars().all()


# PATCH — Update alert status (must own the alert)
@router.patch(
    "/{alert_id}/status",
    response_model=AlertResponse
)
def update_alert_status(
    alert_id: int,
    update: AlertStatusUpdate,
    current_astronaut_id: int = Depends(get_current_astronaut_id),
    db: Session = Depends(get_db),
):
    alert = db.get(HealthAlert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Ownership check: prevent changing another astronaut's alert status
    if alert.astronaut_id != current_astronaut_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: you can only update your own alert status",
        )

    allowed_statuses = {"OPEN", "ACKNOWLEDGED", "RESOLVED"}
    new_status = update.status.upper()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use OPEN, ACKNOWLEDGED or RESOLVED.",
        )

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    if new_status == "ACKNOWLEDGED":
        if alert.acknowledged_at is None:
            alert.acknowledged_at = now
    elif new_status == "RESOLVED":
        if alert.acknowledged_at is None:
            alert.acknowledged_at = now
        if alert.resolved_at is None:
            alert.resolved_at = now

    alert.status = new_status

    try:
        db.commit()
        db.refresh(alert)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update alert status")

    return alert
