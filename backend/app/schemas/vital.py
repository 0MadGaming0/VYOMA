
from datetime import datetime

from pydantic import BaseModel, Field


class VitalReadingCreate(BaseModel):
    astronaut_id: int = Field(gt=0)

    heart_rate: float | None = Field(default=None, gt=0, le=300)
    hrv: float | None = Field(default=None, ge=0, le=500)
    spo2: float | None = Field(default=None, gt=0, le=100)

    systolic_bp: int | None = Field(default=None, gt=0, le=300)
    diastolic_bp: int | None = Field(default=None, gt=0, le=200)

    body_temperature: float | None = Field(default=None, gt=0, le=50)
    respiratory_rate: float | None = Field(default=None, gt=0, le=100)


class VitalReadingResponse(BaseModel):
    id: int
    astronaut_id: int

    heart_rate: float | None
    hrv: float | None
    spo2: float | None

    systolic_bp: int | None
    diastolic_bp: int | None

    body_temperature: float | None
    respiratory_rate: float | None

    recorded_at: datetime

    model_config = {
        "from_attributes": True
    }
