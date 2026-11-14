
from sqlalchemy import (
    Column,
    Integer,
    Float,
    DateTime,
    ForeignKey
)
from sqlalchemy.sql import func

from app.database.base import Base


class VitalReading(Base):
    __tablename__ = "vital_readings"

    id = Column(Integer, primary_key=True, index=True)

    astronaut_id = Column(
        Integer,
        ForeignKey("astronaut_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    heart_rate = Column(Float, nullable=True)
    hrv = Column(Float, nullable=True)
    spo2 = Column(Float, nullable=True)

    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)

    body_temperature = Column(Float, nullable=True)
    respiratory_rate = Column(Float, nullable=True)

    recorded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
