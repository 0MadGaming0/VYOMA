from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.assistant_engine import (
    generate_assistant_response,
    _try_external_llm,
)
from app.auth.dependencies import _extract_token
from app.auth.security import decode_access_token


router = APIRouter(
    prefix="/api/assistant",
    tags=["AstroAssist AI"]
)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    req: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Onboard conversational medical intelligence assistant.
    Provides telemetry-aware medical reasoning and flight triage support.
    """
    # Attempt to resolve astronaut_id from token if not explicitly provided
    resolved_astro_id = req.astronaut_id
    if not resolved_astro_id:
        token = _extract_token(request)
        if token:
            try:
                payload = decode_access_token(token)
                if payload and payload.get("sub"):
                    resolved_astro_id = int(payload["sub"])
            except Exception:
                pass

    # 1. First generate the local telemetry-rich response and context
    local_response = generate_assistant_response(
        message=req.message,
        astronaut_id=resolved_astro_id,
        history=req.history or [],
        db=db,
    )

    # 2. If an external LLM is configured (e.g. Groq, OpenAI, Gemini, Neon AI Gateway), try augmenting with frontier LLM
    if (
        os.environ.get("GROQ_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("NEON_AI_GATEWAY_KEY")
        or os.environ.get("GEMINI_API_KEY")
    ):
        ctx = local_response.context_used or {}
        vitals = ctx.get("latest_vitals", {})
        system_prompt = (
            f"You are AstroAssist, the onboard flight surgeon AI for Project VYOMA (Astronaut Health Intelligence System). "
            f"You are speaking with astronaut {ctx.get('name', 'Astronaut')} ({ctx.get('astronaut_code', 'AST-001')}) "
            f"on mission {ctx.get('mission', 'EXP-72')}. "
            f"Live Telemetry Snapshot: Heart Rate={vitals.get('heart_rate')} BPM, SpO2={vitals.get('spo2')}%, "
            f"BP={vitals.get('blood_pressure')}, Core Temp={vitals.get('body_temperature')}C, "
            f"Respiratory Rate={vitals.get('respiratory_rate')}/min. "
            f"Open Alerts Count: {ctx.get('open_alerts_count', 0)}. "
            f"Guidelines: Be concise, calm, professional, and explainable according to space medicine principles (NASA STD-3001). "
            f"Always prioritize astronaut safety and clearly state when an issue requires flight surgeon consultation."
        )
        llm_reply = await _try_external_llm(req.message, system_prompt, req.history or [])
        if llm_reply:
            local_response.reply = llm_reply

    return local_response
