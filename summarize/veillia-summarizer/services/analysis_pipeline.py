"""Orchestrates the end-to-end structured analysis pipeline.

Supabase -> Load Articles Missing Analysis -> Prepare Prompt -> Local LLM
-> Parse Structured Sections -> Validate -> Update Database

Same shape as `services/pipeline.py` (summarization) and
`services/classification_pipeline.py` on purpose -- same pattern, third
task on top of the same local model infrastructure.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from database.base import ArticleAnalysisRepository, ArticleContentRepository
from exceptions import AnalysisError
from llm.analyzer import ArticleAnalyzer
from llm.base import LLMClient
from models.analysis import AnalysisResult
from models.article import Article
from services.analysis_validator import AnalysisValidatorInterface
from services.content_fetcher import ContentFetcher

logger = logging.getLogger(__name__)


@dataclass
class AnalysisStats:
    """Aggregate statistics for a single analysis run."""

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
            "Analysis finished | model=%s | processed=%d | success=%d | "
            "failed=%d | skipped=%d | duration=%.2fs",
            self.model_used,
            self.total_processed,
            self.successful,
            self.failed,
            self.skipped,
            self.duration_seconds,
        )


class AnalysisPipeline:
    """Coordinates repository, analyzer, and validator for structured analysis.

    Depends only on abstractions (`ArticleAnalysisRepository`,
    `ArticleAnalyzer`, `AnalysisValidatorInterface`, `LLMClient`), so it can
    share the same Ollama backend, config, and Supabase connection as every
    other pipeline without any coupling between them.
    """

    def __init__(
        self,
        repository: ArticleAnalysisRepository,
        analyzer: ArticleAnalyzer,
        validator: AnalysisValidatorInterface,
        llm_client: LLMClient,
        min_content_chars: int = 30,
    ) -> None:
        self._repository = repository
        self._analyzer = analyzer
        self._validator = validator
        self._llm_client = llm_client
        # Deliberately low: many scraped articles only have a short
        # excerpt/snippet rather than full page text, and the goal is to
        # produce a best-effort structured analysis from whatever is
        # available rather than skip most of the table. This is much
        # lower than the old hardcoded 200-char threshold.
        self._min_content_chars = min_content_chars

    def run(self, batch_size: int) -> AnalysisStats:
        stats = AnalysisStats(model_used=self._llm_client.model_name)

        logger.info("Checking Ollama availability for model '%s'...", self._llm_client.model_name)
        if not self._llm_client.health_check():
            logger.error(
                "LLM backend unavailable or model not pulled. Try: ollama pull %s",
                self._llm_client.model_name,
            )
            stats.finished_at = time.monotonic()
            return stats

        articles = self._repository.get_articles_missing_analysis(limit=batch_size)
        logger.info("Loaded %d article(s) missing analysis.", len(articles))

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

    def _process_article(self, article: Article) -> AnalysisResult:
        start = time.monotonic()

        if not article.has_enough_content(min_chars=self._min_content_chars):
            logger.warning(
                "Article %d skipped: insufficient content (< %d chars).",
                article.id, self._min_content_chars,
            )
            return AnalysisResult(
                article_id=article.id,
                analysis=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message="skipped: insufficient content",
            )

        try:
            analysis = self._analyzer.analyze(article)
        except AnalysisError as exc:
            logger.error("Article %d failed during analysis: %s", article.id, exc)
            return AnalysisResult(
                article_id=article.id,
                analysis=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        validation = self._validator.validate(article, analysis)
        if not validation.is_valid:
            logger.warning("Article %d analysis rejected: %s", article.id, validation.reason)
            return AnalysisResult(
                article_id=article.id,
                analysis=analysis,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=validation.reason,
                duration_seconds=round(time.monotonic() - start, 2),
            )

        try:
            self._repository.update_analysis(article.id, analysis.to_dict())
        except Exception as exc:  # noqa: BLE001
            logger.error("Article %d failed to persist analysis: %s", article.id, exc)
            return AnalysisResult(
                article_id=article.id,
                analysis=analysis,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        duration = round(time.monotonic() - start, 2)
        logger.info("Article %d analyzed successfully (%.2fs).", article.id, duration)
        return AnalysisResult(
            article_id=article.id,
            analysis=analysis,
            success=True,
            model_used=self._llm_client.model_name,
            duration_seconds=duration,
        )
