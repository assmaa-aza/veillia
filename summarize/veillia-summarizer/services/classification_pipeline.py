"""Orchestrates the end-to-end classification pipeline.

Supabase -> Load Unclassified Articles -> Prepare Prompt -> Local LLM
-> Predict Category -> Validate Category -> Update Database

Structurally identical to `services/pipeline.py` (the summarization
pipeline) on purpose -- same shape, different task -- so both can be
maintained and extended the same way.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from database.base import ArticleClassificationRepository
from exceptions import ClassificationError
from llm.base import LLMClient
from llm.classifier import TopicClassifier
from models.article import Article, ClassificationResult
from services.classification_validator import ClassificationValidatorInterface

logger = logging.getLogger(__name__)


@dataclass
class ClassificationStats:
    """Aggregate statistics for a single classification run."""

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
            "Classification finished | model=%s | processed=%d | success=%d | "
            "failed=%d | skipped=%d | duration=%.2fs",
            self.model_used,
            self.total_processed,
            self.successful,
            self.failed,
            self.skipped,
            self.duration_seconds,
        )


class ClassificationPipeline:
    """Coordinates repository, classifier, and validator for topic labeling.

    Depends only on abstractions (`ArticleClassificationRepository`,
    `TopicClassifier`, `ClassificationValidatorInterface`, `LLMClient`), so
    it can share the exact same Ollama backend, config, and Supabase
    connection as the summarization pipeline without any coupling between
    the two.
    """

    def __init__(
        self,
        repository: ArticleClassificationRepository,
        classifier: TopicClassifier,
        validator: ClassificationValidatorInterface,
        llm_client: LLMClient,
    ) -> None:
        self._repository = repository
        self._classifier = classifier
        self._validator = validator
        self._llm_client = llm_client

    def run(self, batch_size: int) -> ClassificationStats:
        stats = ClassificationStats(model_used=self._llm_client.model_name)

        logger.info("Checking Ollama availability for model '%s'...", self._llm_client.model_name)
        if not self._llm_client.health_check():
            logger.error(
                "LLM backend unavailable or model not pulled. Try: ollama pull %s",
                self._llm_client.model_name,
            )
            stats.finished_at = time.monotonic()
            return stats

        articles = self._repository.get_unclassified_articles(limit=batch_size)
        logger.info("Loaded %d unclassified article(s).", len(articles))

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

    def _process_article(self, article: Article) -> ClassificationResult:
        start = time.monotonic()

        if not article.has_enough_content(min_chars=50):
            logger.warning("Article %d skipped: insufficient content.", article.id)
            return ClassificationResult(
                article_id=article.id,
                category=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message="skipped: insufficient content",
            )

        try:
            category = self._classifier.classify(article)
        except ClassificationError as exc:
            logger.error("Article %d failed during classification: %s", article.id, exc)
            return ClassificationResult(
                article_id=article.id,
                category=None,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        validation = self._validator.validate(category)
        if not validation.is_valid:
            logger.warning("Article %d category rejected: %s", article.id, validation.reason)
            return ClassificationResult(
                article_id=article.id,
                category=category.value,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=validation.reason,
                duration_seconds=round(time.monotonic() - start, 2),
            )

        try:
            self._repository.update_category(article.id, category.value)
        except Exception as exc:  # noqa: BLE001
            logger.error("Article %d failed to persist category: %s", article.id, exc)
            return ClassificationResult(
                article_id=article.id,
                category=category.value,
                success=False,
                model_used=self._llm_client.model_name,
                error_message=str(exc),
                duration_seconds=round(time.monotonic() - start, 2),
            )

        duration = round(time.monotonic() - start, 2)
        logger.info(
            "Article %d classified as '%s' (%.2fs).", article.id, category.value, duration
        )
        return ClassificationResult(
            article_id=article.id,
            category=category.value,
            success=True,
            model_used=self._llm_client.model_name,
            duration_seconds=duration,
        )
