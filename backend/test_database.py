from sqlalchemy import select
from app.database.connection import SessionLocal
from app.database.base import Base
from app.models import astronaut

from app.models.astronaut import AstronautProfile

with SessionLocal() as db:
    statement = select(AstronautProfile).where(
        AstronautProfile.astronaut_code == "AST-001"
    )

    astronaut_record = db.execute(statement).scalar_one_or_none()

    if astronaut_record:
        print("Astronaut retrieved successfully!")
        print("ID:", astronaut_record.id)
        print("Code:", astronaut_record.astronaut_code)
        print("Name:", astronaut_record.name)
        print("Age:", astronaut_record.age)
        print("Mission:", astronaut_record.mission_id)
    else:
        print("Astronaut not found!")