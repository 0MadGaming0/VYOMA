from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User prompt or question")
    astronaut_id: Optional[int] = Field(default=None, description="Optional target astronaut profile id")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant reply")
    astronaut_id: Optional[int] = None
    astronaut_code: Optional[str] = None
    context_used: Optional[Dict[str, Any]] = None
    suggested_actions: List[str] = Field(default_factory=list, description="Follow-up quick prompt pills")
