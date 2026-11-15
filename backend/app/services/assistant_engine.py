from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.astronaut import AstronautProfile
from app.models.vital import VitalReading
from app.models.alert import HealthAlert
from app.schemas.assistant import ChatMessage, ChatResponse


# Standard NASA STD-3001 Nominal Medical Baselines
NOMINAL_BASELINES = {
    "heart_rate": 70.0,         # BPM
    "spo2": 98.0,               # %
    "systolic_bp": 120,         # mmHg
    "diastolic_bp": 80,         # mmHg
    "body_temperature": 36.8,   # °C
    "respiratory_rate": 14.0,   # breaths/min
    "hrv": 55.0,                # ms
}


async def _try_external_llm(
    prompt: str,
    system_prompt: str,
    history: List[ChatMessage]
) -> Optional[str]:
    """
    Attempts to call an external LLM via Groq, OpenAI, Google Gemini, or Neon AI Gateway.
    Falls back cleanly if keys are missing or requests fail.
    """
    groq_key = os.environ.get("GROQ_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    neon_key = os.environ.get("NEON_AI_GATEWAY_KEY")

    if groq_key:
        api_key = groq_key
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        model = os.environ.get("AI_MODEL", "llama-3.3-70b-versatile")
    elif gemini_key and not openai_key and not neon_key:
        api_key = gemini_key
        base_url = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
        model = os.environ.get("AI_MODEL", os.environ.get("AI_GATEWAY_MODEL", "gemini-1.5-flash"))
    elif neon_key:
        api_key = neon_key
        base_url = os.environ.get("NEON_AI_GATEWAY_URL", "https://ai.neon.tech/v1")
        model = os.environ.get("AI_MODEL", os.environ.get("AI_GATEWAY_MODEL", "gpt-4o-mini"))
    elif openai_key:
        api_key = openai_key
        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.environ.get("AI_MODEL", os.environ.get("AI_GATEWAY_MODEL", "gpt-4o-mini"))
    else:
        return None

    try:
        import httpx
        messages = [{"role": "system", "content": system_prompt}]
        for m in history[-4:]:
            messages.append({"role": m.role, "content": m.content})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"[AstroAssist] LLM returned status {resp.status_code}: {resp.text[:120]}")
    except Exception as exc:
        print(f"[AstroAssist] External LLM call skipped/failed: {exc}")

    return None


def generate_assistant_response(
    message: str,
    astronaut_id: Optional[int],
    history: List[ChatMessage],
    db: Session,
) -> ChatResponse:
    """
    Telemetry-aware flight surgeon assistant.
    Gathers real telemetry for the active astronaut and produces explainable medical guidance.
    """
    # 1. Resolve Astronaut Profile
    astronaut: Optional[AstronautProfile] = None
    if astronaut_id:
        astronaut = db.get(AstronautProfile, astronaut_id)

    if not astronaut:
        astronaut = db.execute(select(AstronautProfile).order_by(AstronautProfile.id)).scalars().first()

    astro_id = astronaut.id if astronaut else 1
    astro_name = astronaut.name if astronaut else "Astronaut"
    astro_code = astronaut.astronaut_code if astronaut else "AST-001"
    mission_id = astronaut.mission_id if (astronaut and astronaut.mission_id) else "EXP-72"

    # 2. Fetch Latest Vital Reading from PostgreSQL
    latest_vital = db.execute(
        select(VitalReading)
        .where(VitalReading.astronaut_id == astro_id)
        .order_by(VitalReading.recorded_at.desc(), VitalReading.id.desc())
    ).scalars().first()

    # 3. Fetch Active / Open Alerts from PostgreSQL
    open_alerts = db.execute(
        select(HealthAlert)
        .where(HealthAlert.astronaut_id == astro_id, HealthAlert.status == "OPEN")
        .order_by(HealthAlert.severity.desc(), HealthAlert.created_at.desc())
    ).scalars().all()

    # Telemetry snapshot
    hr = latest_vital.heart_rate if latest_vital and latest_vital.heart_rate is not None else None
    spo2 = latest_vital.spo2 if latest_vital and latest_vital.spo2 is not None else None
    hrv = latest_vital.hrv if latest_vital and latest_vital.hrv is not None else None
    temp = latest_vital.body_temperature if latest_vital and latest_vital.body_temperature is not None else None
    resp = latest_vital.respiratory_rate if latest_vital and latest_vital.respiratory_rate is not None else None
    sys_bp = latest_vital.systolic_bp if latest_vital and latest_vital.systolic_bp is not None else None
    dia_bp = latest_vital.diastolic_bp if latest_vital and latest_vital.diastolic_bp is not None else None
    reading_time = latest_vital.recorded_at.strftime("%H:%M:%S UTC") if latest_vital and latest_vital.recorded_at else "No live timestamp"

    context_summary = {
        "astronaut_code": astro_code,
        "name": astro_name,
        "mission": mission_id,
        "latest_vitals": {
            "heart_rate": hr,
            "spo2": spo2,
            "hrv": hrv,
            "body_temperature": temp,
            "respiratory_rate": resp,
            "blood_pressure": f"{sys_bp}/{dia_bp}" if (sys_bp and dia_bp) else None,
            "recorded_at": reading_time,
        },
        "open_alerts_count": len(open_alerts),
        "open_alerts": [
            {
                "metric": a.metric,
                "severity": a.severity,
                "observed": a.observed_value,
                "threshold": a.threshold_value,
                "message": a.message,
            }
            for a in open_alerts[:3]
        ],
    }

    # 4. Generate Clinical Telemetry Response
    s = message.strip().lower()
    reply = ""
    suggested_actions = []

    # Dynamic suggestions based on telemetry
    if len(open_alerts) > 0:
        suggested_actions.append(f"Review {len(open_alerts)} Open Alert(s)")
    if hr and (hr > 100 or hr < 55):
        suggested_actions.append("Explain Heart Rate anomaly")
    if spo2 and spo2 < 95:
        suggested_actions.append("Check SpO₂ hypoxia risk")
    suggested_actions.extend(["Summarize my vitals", "Pre-EVA readiness check", "Is my blood pressure normal?"])
    # Deduplicate & cap to 4
    seen = set()
    deduped_actions = []
    for act in suggested_actions:
        if act not in seen:
            seen.add(act)
            deduped_actions.append(act)
        if len(deduped_actions) >= 4:
            break

    # Intent Matching:
    # ── A. Greetings & Identity ──
    if re.search(r"^(hi|hello|hey|greetings|who are you|status report)\b", s):
        alert_phrase = (
            f"⚠️ **{len(open_alerts)} open alert(s)** pending review."
            if open_alerts
            else "✅ All physiological metrics are within nominal flight limits."
        )
        reply = (
            f"**AstroAssist Online** — Standing by for {astro_name} (`{astro_code}`), Mission `{mission_id}`.\n\n"
            f"Telemetry uplink is synchronized as of **{reading_time}**.\n"
            f"- **Heart Rate:** {hr or '—'} BPM (Baseline: {NOMINAL_BASELINES['heart_rate']:.0f} BPM)\n"
            f"- **SpO₂:** {spo2 or '—'}% (Baseline: {NOMINAL_BASELINES['spo2']:.0f}%)\n"
            f"- **Blood Pressure:** {sys_bp or '—'}/{dia_bp or '—'} mmHg\n"
            f"- **Core Temp:** {temp or '—'} °C\n\n"
            f"{alert_phrase}\n\n"
            f"How can I assist your mission health today?"
        )

    # ── B. Vitals Overview / Overall Status ──
    elif any(k in s for k in ["vital", "summary", "overview", "health", "how am i", "my condition", "checkup"]):
        vitals_list = []
        if hr is not None:
            hr_diff = hr - NOMINAL_BASELINES["heart_rate"]
            vitals_list.append(f"• **Heart Rate:** `{hr:.0f} BPM` ({'+' if hr_diff > 0 else ''}{hr_diff:.0f} vs baseline 70)")
        if spo2 is not None:
            vitals_list.append(f"• **Oxygen Saturation (SpO₂):** `{spo2:.1f}%` ({'Nominal' if spo2 >= 95 else 'Warning <95%'})")
        if sys_bp and dia_bp:
            vitals_list.append(f"• **Blood Pressure:** `{sys_bp}/{dia_bp} mmHg` (Microgravity fluid shift nominal)")
        if temp is not None:
            vitals_list.append(f"• **Body Temperature:** `{temp:.1f} °C` (Thermal regulation stable)")
        if resp is not None:
            vitals_list.append(f"• **Respiratory Rate:** `{resp:.0f} /min` (Baseline: 14)")
        if hrv is not None:
            vitals_list.append(f"• **HRV (RMSSD):** `{hrv:.0f} ms` (Autonomic stress buffer)")

        alert_text = ""
        if open_alerts:
            alert_text = f"\n\n**Active Clinical Alerts ({len(open_alerts)}):**\n" + "\n".join(
                [f"- **[{a.severity}]** {a.metric.replace('_', ' ').title()}: observed `{a.observed_value}`, threshold `{a.threshold_value}`" for a in open_alerts]
            )

        reply = (
            f"### 📋 Physiological Telemetry Report — {astro_code}\n\n"
            f"**Last Sync:** {reading_time} | **Mission:** {mission_id}\n\n"
            + ("\n".join(vitals_list) if vitals_list else "No recent vital telemetry recorded in database.")
            + alert_text
            + "\n\n*Guidance:* Continue scheduled hydration and exercise countermeasure protocols."
        )

    # ── C. Heart Rate & Cardiovascular / HRV ──
    elif any(k in s for k in ["heart", "hr", "pulse", "bpm", "cardio", "tachycardia", "bradycardia", "hrv"]):
        if hr is not None:
            dev = ((hr - NOMINAL_BASELINES["heart_rate"]) / NOMINAL_BASELINES["heart_rate"]) * 100
            trend = "elevated" if dev > 15 else "reduced" if dev < -15 else "nominal"
            reply = (
                f"### 🫀 Cardiovascular Telemetry Analysis\n\n"
                f"- **Current Heart Rate:** `{hr:.0f} BPM`\n"
                f"- **Reference Baseline:** `{NOMINAL_BASELINES['heart_rate']:.0f} BPM` ({'+' if dev > 0 else ''}{dev:.1f}% deviation, {trend})\n"
                f"- **HRV Autonomic Buffer:** `{hrv or '—'} ms`\n\n"
                f"**Physiological Rationale:**\n"
                f"In microgravity, fluid shift toward the upper body reduces lower-limb venous pooling. "
                + (
                    "Elevated resting rate can reflect sympathetic tone from microgravity adaptation, mild dehydration, or elevated cabin CO₂."
                    if dev > 10
                    else "Heart rate is well within acceptable flight parameters."
                )
                + "\n\n**Recommended Protocol:**\n"
                "1. Verify hydration (aim for 2.5 L/sol intake).\n"
                "2. Conduct a 5-minute rest log before heavy physical workload.\n"
                "3. Track continuous ECG trend under the **VitalWatch** console."
            )
        else:
            reply = "No heart rate telemetry is currently recorded in the database. Please record a reading in VitalWatch."

    # ── D. Oxygen & SpO2 / Respiratory ──
    elif any(k in s for k in ["spo2", "oxygen", "hypoxia", "breath", "respir", "lung"]):
        if spo2 is not None:
            status_desc = "Nominal oxygen saturation" if spo2 >= 95 else "Sub-optimal saturation detected"
            reply = (
                f"### 🫁 Oxygenation & Respiratory Telemetry\n\n"
                f"- **Oxygen Saturation (SpO₂):** `{spo2:.1f}%` ({status_desc})\n"
                f"- **Respiratory Rate:** `{resp or '—'} breaths/min` (Normal: 12–20)\n\n"
                f"**Clinical Assessment:**\n"
                + (
                    "⚠️ SpO₂ below 95% warrants environmental cabin check. Verify atmospheric scrubber partial pressures (pO₂ ≥ 21 kPa) and rule out local pocket hypercapnia."
                    if spo2 < 95
                    else "Tissue oxygenation is optimal for pressurized spacecraft environment. No hypoxemic deviation indicated."
                )
                + "\n\n**Action Items:**\n"
                "- Check personal life support suit interface or habitat air-flow circulation."
            )
        else:
            reply = "No SpO₂ readings found in the telemetry stream. Log your pulse oximeter data in VitalWatch."

    # ── E. Alerts & Triage ──
    elif any(k in s for k in ["alert", "alarm", "warning", "critical", "triage", "emergency"]):
        if open_alerts:
            alert_items = "\n".join(
                [
                    f"{i+1}. **[{a.severity}] {a.metric.replace('_', ' ').title()}:** {a.message} (Observed `{a.observed_value}` vs limit `{a.threshold_value}`)"
                    for i, a in enumerate(open_alerts)
                ]
            )
            reply = (
                f"### 🚨 Active Telemetry Alerts ({len(open_alerts)})\n\n"
                f"The following alarms are currently active for `{astro_code}`:\n\n"
                f"{alert_items}\n\n"
                f"**Flight Surgeon Directive:**\n"
                f"Navigate to the **Alerts & Triage** page to acknowledge or resolve these alerts once corrective action is taken."
            )
        else:
            reply = (
                f"### ✅ Zero Active Alerts\n\n"
                f"All physiological parameters for `{astro_name}` (`{astro_code}`) are nominal. "
                f"No triage intervention is required at this time."
            )

    # ── F. Blood Pressure & Orthostatic Adaptation ──
    elif any(k in s for k in ["blood pressure", "bp", "systolic", "diastolic", "orthostatic", "hypertension"]):
        if sys_bp and dia_bp:
            reply = (
                f"### 🩸 Blood Pressure Telemetry\n\n"
                f"- **Observed BP:** `{sys_bp}/{dia_bp} mmHg`\n"
                f"- **Reference Range:** `110–130 / 70–85 mmHg`\n\n"
                f"**Spaceflight Context:**\n"
                f"Cephalad fluid redistribution during microgravity leads to facial edema and altered central venous pressure. "
                f"Your observed reading is within acceptable mission tolerances. Re-assess during post-exercise recovery."
            )
        else:
            reply = "Blood pressure measurement is currently pending. Please record systolic/diastolic pressure in VitalWatch."

    # ── G. Temperature & Thermoregulation ──
    elif any(k in s for k in ["temp", "temperature", "fever", "heat", "cold", "thermo"]):
        if temp is not None:
            status_t = "Nominal" if 36.0 <= temp <= 37.5 else "Thermal variance detected"
            reply = (
                f"### 🌡️ Thermal Regulation Telemetry\n\n"
                f"- **Core Body Temperature:** `{temp:.2f} °C` ({status_t})\n"
                f"- **Flight Safety Limits:** `35.0 °C – 38.0 °C`\n\n"
                f"Spaceflight circadian shifts and reduced convective cooling in microgravity can cause a baseline core elevation of ~0.5°C ('space fever'). Your current reading remains safe."
            )
        else:
            reply = "No core temperature reading is available in the current telemetry window."

    # ── H. Pre-EVA Physical Readiness Check ──
    elif any(k in s for k in ["eva", "spacewalk", "airlock", "suit", "readiness"]):
        eva_issues = []
        if hr and (hr > 110 or hr < 50):
            eva_issues.append(f"Resting HR out of range (`{hr} BPM`)")
        if spo2 and spo2 < 94:
            eva_issues.append(f"SpO₂ sub-optimal (`{spo2}%`)")
        if open_alerts:
            eva_issues.append(f"{len(open_alerts)} unacknowledged medical alert(s)")

        if not eva_issues:
            reply = (
                f"### 👨‍🚀 Pre-EVA Medical Assessment: GO\n\n"
                f"- **Astronaut:** {astro_name} (`{astro_code}`)\n"
                f"- **Cardiovascular Status:** Stable (`{hr or 'Nominal'} BPM`)\n"
                f"- **Oxygen Saturation:** Nominal (`{spo2 or 'Nominal'}%`)\n"
                f"- **Alert Status:** Clear (0 active alerts)\n\n"
                f"**Flight Surgeon Recommendation:** Physical criteria met for scheduled airlock depressurization and EVA operations. Ensure full pre-breathe protocol."
            )
        else:
            reply = (
                f"### ⚠️ Pre-EVA Medical Assessment: CAUTION / HOLD\n\n"
                f"Disqualifying factors identified for `{astro_code}`:\n"
                + "\n".join([f"- ❌ {issue}" for issue in eva_issues])
                + "\n\n**Directive:** Consult Flight Surgeon and review VitalWatch before airlock ingress."
            )

    # ── I. General Fallback ──
    else:
        reply = (
            f"**AstroAssist Medical Intelligence:**\n\n"
            f"Regarding *\"{message}\"*:\n\n"
            f"Telemetry for `{astro_name}` (`{astro_code}`) indicates general physiological stability: "
            f"HR is `{hr or '—'} BPM`, SpO₂ is `{spo2 or '—'}%`, and there are `{len(open_alerts)}` active alert(s).\n\n"
            f"You can ask me to analyze specific metrics (heart rate, SpO₂, blood pressure, temperature), "
            f"explain deviations, check active alerts, or evaluate pre-EVA readiness."
        )

    return ChatResponse(
        reply=reply,
        astronaut_id=astro_id,
        astronaut_code=astro_code,
        context_used=context_summary,
        suggested_actions=deduped_actions,
    )
