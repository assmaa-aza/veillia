"""
VeillIA AI Summarizer - Entry point.

Standalone microservice that reads unsummarized articles from Supabase,
generates summaries using a local Ollama LLM, validates them, and writes
them back to the database.

Usage:
    python main.py

Configuration is read from environment variables / a .env file -- see
.env.example for the full list of options.
"""
from __future__ import annotations

import logging
import sys

from config import AppConfig
from database.supabase import SupabaseArticleRepository
from exceptions import ConfigurationError, VeillIAError
from llm.ollama_client import OllamaClient
from llm.prompts import PromptBuilder
from llm.summarizer import ChunkedLLMSummarizer, LLMSummarizer, Summarizer
from logging_config import setup_logging
from services.pipeline import SummarizationPipeline
from services.validator import SummaryValidator

logger = logging.getLogger(__name__)


def main() -> int:
    """Wire up dependencies and run one pass of the summarization pipeline."""
    try:
        config = AppConfig.from_env()
    except ConfigurationError as exc:
        # Logging isn't configured yet at this point, so print directly.
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    setup_logging(config.log_level)
    logger.info("Starting VeillIA AI Summarizer")
    logger.info(
        "Config loaded | model=%s | ollama_url=%s | batch_size=%d | word_range=%d-%d",
        config.ollama.model,
        config.ollama.base_url,
        config.summarization.batch_size,
        config.summarization.min_words,
        config.summarization.max_words,
    )

    try:
        # --- Composition root: concrete implementations are wired here, ---
        # --- and only here. Every other module depends on abstractions. ---
        repository = SupabaseArticleRepository(config.supabase)
        llm_client = OllamaClient(config.ollama)
        prompt_builder = PromptBuilder(
            min_words=config.summarization.min_words,
            max_words=config.summarization.max_words,
        )
        summarizer: Summarizer
        if config.summarization.use_chunking:
            summarizer = ChunkedLLMSummarizer(
                llm_client,
                prompt_builder,
                num_chunks=config.summarization.num_chunks,
                direct_fallback_chars=config.summarization.chunking_min_chars,
            )
            logger.info(
                "Using chunked summarization (%d parts, direct fallback under %d chars).",
                config.summarization.num_chunks,
                config.summarization.chunking_min_chars,
            )
        else:
            summarizer = LLMSummarizer(llm_client, prompt_builder)
            logger.info("Using single-pass summarization.")
        validator = SummaryValidator(config.summarization)

        pipeline = SummarizationPipeline(
            repository=repository,
            summarizer=summarizer,
            validator=validator,
            llm_client=llm_client,
        )

        pipeline.run(batch_size=config.summarization.batch_size)
    except VeillIAError as exc:
        logger.error("Fatal error: %s", exc)
        return 1
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected fatal error")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
