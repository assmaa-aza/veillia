"""Domain model for structured article analysis.

Kept as its own module so the shape of an "analysis" (the exact fields, how
it serializes to/from the `analysis` jsonb column) has one source of truth,
independent of how it gets generated (LLM today, something else later).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ArticleAnalysis:
    """A structured business/technology analysis of a single article."""

    concise_summary: str
    key_insight: str
    business_impact: str
    opportunities: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    affected_industries: list[str] = field(default_factory=list)
    conclusion: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Serialize to the exact shape stored in the `analysis` jsonb column."""
        return {
            "concise_summary": self.concise_summary,
            "key_insight": self.key_insight,
            "business_impact": self.business_impact,
            "opportunities": self.opportunities,
            "risks": self.risks,
            "affected_industries": self.affected_industries,
            "conclusion": self.conclusion,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ArticleAnalysis":
        """Rebuild from a row's `analysis` jsonb value."""
        return cls(
            concise_summary=data.get("concise_summary", ""),
            key_insight=data.get("key_insight", ""),
            business_impact=data.get("business_impact", ""),
            opportunities=list(data.get("opportunities") or []),
            risks=list(data.get("risks") or []),
            affected_industries=list(data.get("affected_industries") or []),
            conclusion=data.get("conclusion", ""),
        )


@dataclass
class AnalysisResult:
    """Outcome of a single analysis attempt, used for logging/metrics."""

    article_id: int
    analysis: ArticleAnalysis | None
    success: bool
    model_used: str
    error_message: str | None = None
    duration_seconds: float = 0.0
