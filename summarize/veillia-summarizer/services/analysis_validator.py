"""Validation logic for generated article analyses.

`AnalysisParser` already guarantees the three critical fields
(concise_summary, key_insight, conclusion) are non-empty -- a parse failure
there raises before this validator is ever reached. This validator is the
next layer: sanity checks on content quality once parsing succeeded.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from models.analysis import ArticleAnalysis
from models.article import Article


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    reason: str = ""


class AnalysisValidatorInterface(ABC):
    @abstractmethod
    def validate(self, article: Article, analysis: ArticleAnalysis) -> ValidationResult:
        raise NotImplementedError


class AnalysisValidator(AnalysisValidatorInterface):
    """Rejects analyses that are implausibly thin or just echo the title."""

    def __init__(self, min_summary_words: int = 10, min_insight_words: int = 4) -> None:
        self._min_summary_words = min_summary_words
        self._min_insight_words = min_insight_words

    def validate(self, article: Article, analysis: ArticleAnalysis) -> ValidationResult:
        summary_words = len(analysis.concise_summary.split())
        if summary_words < self._min_summary_words:
            return ValidationResult(False, f"concise_summary too short ({summary_words} words).")

        insight_words = len(analysis.key_insight.split())
        if insight_words < self._min_insight_words:
            return ValidationResult(False, f"key_insight too short ({insight_words} words).")

        if analysis.concise_summary.strip().lower() == article.title.strip().lower():
            return ValidationResult(False, "concise_summary is identical to the title.")

        if not analysis.conclusion.strip():
            return ValidationResult(False, "conclusion is empty.")

        return ValidationResult(True)
