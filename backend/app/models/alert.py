from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey
)
from sqlalchemy.sql import func

from app.database.base import Base


class HealthAlert(Base):
    __tablename__ = "health_alerts"

    id = Column(Integer, primary_key=True, index=True)

    astronaut_id = Column(
        Integer,
        ForeignKey("astronaut_profiles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    vital_reading_id = Column(
        Integer,
        ForeignKey("vital_readings.id", ondelete="SET NULL"),
        nullable=True
    )

    metric = Column(String(50), nullable=False)

    observed_value = Column(Float, nullable=False)

    threshold_value = Column(Float, nullable=False)

    severity = Column(String(20), nullable=False)

    message = Column(String(255), nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="OPEN"
    )
        # Audit timestamps
    acknowledged_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )