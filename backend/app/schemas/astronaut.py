from datetime import datetime
from pydantic import BaseModel, Field


class AstronautCreate(BaseModel):
    astronaut_code: str = Field(
        min_length=3,
        max_length=50
    )
    name: str = Field(
        min_length=2,
        max_length=100
    )
    age: int | None = Field(
        default=None,
        ge=18,
        le=100
    )
    mission_id: str | None = Field(
        default=None,
        max_length=50
    )


class AstronautResponse(BaseModel):
    id: int
    astronaut_code: str
    name: str
    age: int | None
    mission_id: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
class AstronautUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    age: int | None = Field(default=None, ge=18, le=100)
    mission_id: str | None = Field(default=None, max_length=50)