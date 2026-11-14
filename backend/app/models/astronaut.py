from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class AstronautProfile(Base):
    __tablename__ = "astronaut_profiles"

    id = Column(Integer, primary_key=True, index=True)
    astronaut_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    mission_id = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())