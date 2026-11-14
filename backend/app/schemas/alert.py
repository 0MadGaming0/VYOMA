from datetime import datetime
from pydantic import BaseModel, ConfigDict



class AlertResponse(BaseModel):
    id: int
    astronaut_id: int
    vital_reading_id: int | None
    metric: str
    observed_value: float
    threshold_value: float
    severity: str
    message: str
    status: str
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class AlertStatusUpdate(BaseModel):
    status: str

class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
    skip: int
    limit: int