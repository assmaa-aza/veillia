"""Orchestrates the end-to-end summarization pipeline.

Supabase -> Load Unsummarized Articles -> Prepare Prompt -> Local LLM
-> Generate Summary -> Validate Summary -> Update Database
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from database.base import ArticleRepository
from exceptions import SummarizationError
from llm.base import LLMClient
from llm.summarizer import Summarizer
from models.article import Article, SummaryResult
from services.validator import SummaryValidatorInterface

logger = logging.getLogger(__name__)


@dataclass
class PipelineStats:
    """Aggregate statistics for a single pipeline run (used for logging)."""

    total_processed: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    started_at: float = field(default_factory=time.monotonic)
    finished_at: float | None = None
    model_used: str = ""

    @property
    def duration_seconds(self) -> float:
        end = self.finished_at or time.monotonic()
        return round(end - self.started_at, 2)

    def log_summary(self) -> None:
        logger.info(
            "Pipeline finished | model=%s | processed=%d | success=%d | "
            "failed=%d | skipped=%d | duration=%.2fs",
            self.model_used,
            self.total_processed,
            self.successful,
            self.failed,
            self.skipped,
            self.duration_seconds,
        )


class SummarizationPipeline:
    """Coordinates repository, summarizer, and validator to process articles.

    This class depends only on abstractions (`ArticleRepository`,
    `Summarizer`, `SummaryValidatorInterface`, `LLMClient`), so any concrete
    implementation -- a different database, a different model runtime, a
    stricter validator -- can be swapped in without changing this class
    (Dependency Inversion Principle).
    """

    def __init__(
        self,
        repository: ArticleRepository,
        summarizer: Summarizer,
        validator: SummaryValidatorInterface,
        llm_client: LLMClient,
    ) -> None:
        self._repository = repository
        self._summarizer = summarizer
        self._validator = validator
        self._llm_client = llm_client

    def run(self, batch_size: int) -> PipelineStats:
        """Run one full pass: load a batch, summarize, validate, persist."""
        stats = PipelineStats(model_used=self._llm_client.model_name)

        logger.info("Checking Ollama availability for model '%s'...", self._llm_client.model_name)
        if not self._llm_client.health_check():
            logger.error(
                "LLM backend unavailable or model not pulled. Try: ollama pull %s",
                self._llm_client.model_name,
            )
            stats.finished_at = time.monotonic()
            return stats

        articles = self._repository.get_unsummarized_articles(limit=batch_size)
        logger.info("Loaded %d unsummarized article(s).", len(articles))

        for article in articles:
            stats.total_processed += 1
            result = self._process_article(article)
            if result.success:
                stats.successful += 1
            elif result.error_message and result.error_message.startswith("skipped"):
                stats.skipped += 1
            else:
                stats.failed += 1

        stats.finished_at = time.monotonic()
        stats.log_summary()
        return stats

    def _process_article(self, article: Article) -> SummaryResult:
        start = time.monotonic()

        if not article.has_enough_content():
            logger.warning("Article %d skipped: insufficient content.", article.id)
            return SummaryResult(
                article_id=article.id,
                summary=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message="skipped: insufficient content",
            )

        try:
            summary = self._summarizer.summarize(article)
        except SummarizationError as exc:
            logger.error("Article %d failed during generation: %s", article.id, exc)
            return SummaryResult(
                article_id=article.id,
                summary=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        validation = self._validator.validate(article, summary)
        if not validation.is_valid:
            logger.warning("Article %d summary rejected: %s", article.id, validation.reason)
            return SummaryResult(
                article_id=article.id,
                summary=summary,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=validation.reason,
                duration_seconds=round(time.monotonic() - start, 2),
            )

        try:
            self._repository.update_summary(article.id, summary)
        except Exception as exc:  # noqa: BLE001
            logger.error("Article %d failed to persist: %s", article.id, exc)
            return SummaryResult(
                article_id=article.id,
                summary=summary,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        duration = round(time.monotonic() - start, 2)
        word_count = len(summary.split())
        logger.info(
            "Article %d summarized successfully (%d words, %.2fs).",
            article.id,
            word_count,
            duration,
        )
        return SummaryResult(
            article_id=article.id,
            summary=summary,
            success=True,
            model_used=self._llm_client.model_name,
            word_count=word_count,
            duration_seconds=duration,
        )
