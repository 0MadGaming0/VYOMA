from sqlalchemy.orm import Session

from app.models.alert import HealthAlert
from app.models.vital import VitalReading
from app.services.alert_rules import ALERT_RULES


def evaluate_vital_reading(
    reading: VitalReading,
    db: Session
):
    alerts = []

    for metric, rules in ALERT_RULES.items():

        value = getattr(reading, metric)

        # Skip metrics that were not provided
        if value is None:
            continue

        alert_type = None

        if value < rules["low"]:
            alert_type = "LOW"

        elif value > rules["high"]:
            alert_type = "HIGH"

        if alert_type is None:
            continue

        alert = HealthAlert(
            astronaut_id=reading.astronaut_id,
            vital_reading_id=reading.id,
            metric=metric,
            observed_value=value,
            threshold_value=(
                rules["low"]
                if alert_type == "LOW"
                else rules["high"]
            ),
            severity=rules["severity"],
            message=(
                f"{metric} is {alert_type.lower()}: "
                f"observed {value}, "
                f"threshold {rules['low']}–{rules['high']}"
            ),
            status="OPEN"
        )

        alerts.append(alert)

    if alerts:
        db.add_all(alerts)

    return alerts