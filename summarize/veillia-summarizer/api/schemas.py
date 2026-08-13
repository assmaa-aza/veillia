"""Pydantic request/response schemas for the Article AI Chat API.

Kept separate from `models/chat.py` (the internal `ChatTurn` dataclass):
these are the HTTP contract specifically, free to evolve independently of
how conversation turns are represented internally.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatTurnSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user's new message.")
    conversation_history: list[ChatTurnSchema] = Field(
        default_factory=list,
        description="Prior turns in this conversation, oldest first. The "
        "frontend is responsible for maintaining and resending this each "
        "request (the backend is stateless).",
    )


class ChatResponse(BaseModel):
    article_id: int
    reply: str


class ErrorResponse(BaseModel):
    detail: str
