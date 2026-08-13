"""Domain models used throughout the summarization pipeline.

Keeping these as plain dataclasses (no ORM, no DB-specific types) means the
rest of the codebase never depends directly on Supabase's response shape,
which makes it trivial to swap the storage backend later.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class Article:
    """Represents a row from the `articles` table that needs summarization."""

    id: int
    title: str
    content: str
    source_id: Optional[int] = None
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None
    language: Optional[str] = None
    source: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    category: Optional[str] = None
    analysis: Optional[dict] = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "Article":
        """Build an Article from a raw Supabase row (dict).

        Defensive `.get()` lookups are used throughout so a missing or
        unexpected column never crashes the pipeline; it simply falls back
        to a safe default.
        """
        return cls(
            id=row["id"],
            title=(row.get("title") or "").strip(),
            content=(row.get("content") or "").strip(),
            source_id=row.get("source_id"),
            summary=row.get("summary"),
            author=row.get("author"),
            published_at=row.get("published_at"),
            url=row.get("url"),
            language=row.get("language"),
            source=row.get("source"),
            tags=row.get("tags") or [],
            category=row.get("category"),
            analysis=row.get("analysis"),
        )

    def has_enough_content(self, min_chars: int = 200) -> bool:
        """Basic sanity check: is there enough text to meaningfully summarize?"""
        return len(self.content) >= min_chars


@dataclass
class SummaryResult:
    """Outcome of a single summarization attempt, used for logging/metrics."""

    article_id: int
    summary: Optional[str]
    success: bool
    model_used: str
    error_message: Optional[str] = None
    word_count: int = 0
    duration_seconds: float = 0.0


@dataclass
class ClassificationResult:
    """Outcome of a single classification attempt, used for logging/metrics."""

    article_id: int
    category: Optional[str]
    success: bool
    model_used: str
    error_message: Optional[str] = None
    duration_seconds: float = 0.0
