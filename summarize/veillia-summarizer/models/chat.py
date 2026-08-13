"""Domain model for article chat conversation turns.

Kept as its own tiny module so the shape of a conversation turn has one
source of truth, shared between the API layer (request/response schemas),
the prompt builder, and the LLM client's chat() method.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ChatRole = Literal["user", "assistant"]


@dataclass(frozen=True)
class ChatTurn:
    """A single message in a conversation, either from the user or the assistant."""

    role: ChatRole
    content: str
