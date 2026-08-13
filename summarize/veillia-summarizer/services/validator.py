"""Validation logic for generated summaries.

Kept separate from the summarizer itself (Single Responsibility Principle):
the LLM's job is to generate text, the validator's job is to decide whether
that text is good enough to persist.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass

from config import SummarizationConfig
from models.article import Article

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    reason: str = ""


class SummaryValidatorInterface(ABC):
    @abstractmethod
    def validate(self, article: Article, summary: str) -> ValidationResult:
        raise NotImplementedError


class SummaryValidator(SummaryValidatorInterface):
    """Applies quality checks to a generated summary before it is persisted.

    Checks applied:
        1. Non-empty.
        2. Word count within a tolerant range around [min_words, max_words].
        3. Not just a verbatim copy of the title.
        4. Not longer than the source article (a cheap hallucination guard --
           a summary that "grows" beyond the source is often a sign the
           model padded it with invented detail).
    """

    def __init__(
        self,
        config: SummarizationConfig,
        min_word_buffer: int = 10,
        max_word_buffer: int = 25,
    ) -> None:
        self._min_words = config.min_words
        self._max_words = config.max_words
        # A flat word-count buffer (not a percentage) because LLMs rarely
        # hit an exact target, but a percentage-based tolerance scales
        # poorly for a short target: 50% tolerance on a 30-60 word target
        # would still accept ~90 words, defeating the point of a tight,
        # scannable teaser summary. A fixed buffer stays meaningful
        # regardless of how short or long the configured target is.
        self._soft_min = max(10, config.min_words - min_word_buffer)
        self._soft_max = config.max_words + max_word_buffer

    def validate(self, article: Article, summary: str) -> ValidationResult:
        if not summary or not summary.strip():
            return ValidationResult(False, "Summary is empty.")

        word_count = len(summary.split())
        if word_count < self._soft_min:
            return ValidationResult(False, f"Summary too short ({word_count} words).")
        if word_count > self._soft_max:
            return ValidationResult(False, f"Summary too long ({word_count} words).")

        if summary.strip().lower() == article.title.strip().lower():
            return ValidationResult(False, "Summary is identical to the title.")

        if article.content and len(summary) > len(article.content):
            return ValidationResult(False, "Summary is longer than the source article.")

        return ValidationResult(True)
