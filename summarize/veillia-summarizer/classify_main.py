"""
VeillIA Topic Classifier - Entry point.

Standalone run that reads unclassified articles from Supabase, predicts a
topic category using the same local Ollama LLM as the summarizer, validates
it, and writes it back to the `category` column.

Usage:
    python classify_main.py

Shares configuration with the summarizer (.env) -- see .env.example.
Requires a `category` column on the `articles` table; see README.md for
the SQL to add it.
"""
from __future__ import annotations

import logging
import sys

from config import AppConfig
from database.supabase import SupabaseArticleRepository
from exceptions import ConfigurationError, VeillIAError
from llm.classifier import ChunkedLLMTopicClassifier, LLMTopicClassifier, TopicClassifier
from llm.ollama_client import OllamaClient
from llm.prompts import ClassificationPromptBuilder
from logging_config import setup_logging
from services.classification_pipeline import ClassificationPipeline
from services.classification_validator import ClassificationValidator

logger = logging.getLogger(__name__)


def main() -> int:
    """Wire up dependencies and run one pass of the classification pipeline."""
    try:
        config = AppConfig.from_env()
    except ConfigurationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    setup_logging(config.log_level)
    logger.info("Starting VeillIA Topic Classifier")
    logger.info(
        "Config loaded | model=%s | ollama_url=%s | batch_size=%d",
        config.ollama.model,
        config.ollama.base_url,
        config.classification.batch_size,
    )

    try:
        # Composition root -- concrete implementations wired here only.
        repository = SupabaseArticleRepository(config.supabase)
        llm_client = OllamaClient(config.ollama)
        prompt_builder = ClassificationPromptBuilder(
            max_content_chars=config.classification.max_content_chars,
        )
        classifier: TopicClassifier
        if config.classification.use_chunking:
            classifier = ChunkedLLMTopicClassifier(
                llm_client,
                prompt_builder,
                num_chunks=config.classification.num_chunks,
                direct_fallback_chars=config.classification.chunking_min_chars,
            )
            logger.info(
                "Using chunked classification (%d parts, direct fallback under %d chars).",
                config.classification.num_chunks,
                config.classification.chunking_min_chars,
            )
        else:
            classifier = LLMTopicClassifier(llm_client, prompt_builder)
            logger.info("Using single-pass classification.")
        validator = ClassificationValidator()

        pipeline = ClassificationPipeline(
            repository=repository,
            classifier=classifier,
            validator=validator,
            llm_client=llm_client,
        )

        pipeline.run(batch_size=config.classification.batch_size)
    except VeillIAError as exc:
        logger.error("Fatal error: %s", exc)
        return 1
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected fatal error")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
