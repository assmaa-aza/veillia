"""
VeillIA Article Analyzer - Entry point.

Reads articles from Supabase that don't yet have a structured analysis,
generates one via the local Ollama LLM (concise summary, key insight,
business impact, opportunities, risks, affected industries, conclusion),
validates it, and writes it back to the `analysis` column.

Usage:
    python analysis_main.py

Shares configuration with the other pipelines (.env) -- see .env.example.
Requires an `analysis` jsonb column on the `articles` table; see
migrations/003_add_analysis_column.sql.

To run this automatically right after new articles are collected, schedule
it (cron on Linux/macOS, Task Scheduler on Windows) alongside main.py /
classify_main.py -- see the README for details. This project processes in
batches like the rest of the pipeline rather than reacting to each insert
individually, which keeps it a plain, dependency-free Python script.
"""
from __future__ import annotations

import logging
import sys

from config import AppConfig
from database.supabase import SupabaseArticleRepository
from exceptions import ConfigurationError, VeillIAError
from llm.analyzer import ArticleAnalyzer, ChunkedLLMArticleAnalyzer, LLMArticleAnalyzer
from llm.ollama_client import OllamaClient
from llm.prompts import AnalysisPromptBuilder
from logging_config import setup_logging
from services.analysis_pipeline import AnalysisPipeline
from services.analysis_validator import AnalysisValidator

logger = logging.getLogger(__name__)


def main() -> int:
    """Wire up dependencies and run one pass of the analysis pipeline."""
    try:
        config = AppConfig.from_env()
    except ConfigurationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    setup_logging(config.log_level)
    logger.info("Starting VeillIA Article Analyzer")
    logger.info(
        "Config loaded | model=%s | ollama_url=%s | batch_size=%d | min_content_chars=%d",
        config.ollama.model,
        config.ollama.base_url,
        config.analysis.batch_size,
        config.analysis.min_content_chars,
    )

    try:
        # Composition root -- concrete implementations wired here only.
        repository = SupabaseArticleRepository(config.supabase)
        llm_client = OllamaClient(config.ollama)
        prompt_builder = AnalysisPromptBuilder(
            max_content_chars=config.analysis.max_content_chars,
        )
        analyzer: ArticleAnalyzer
        if config.analysis.use_chunking:
            analyzer = ChunkedLLMArticleAnalyzer(
                llm_client,
                prompt_builder,
                num_chunks=config.analysis.num_chunks,
                direct_fallback_chars=config.analysis.chunking_min_chars,
            )
            logger.info(
                "Using chunked analysis (%d parts, direct fallback under %d chars).",
                config.analysis.num_chunks,
                config.analysis.chunking_min_chars,
            )
        else:
            analyzer = LLMArticleAnalyzer(llm_client, prompt_builder)
            logger.info("Using single-pass analysis.")
        validator = AnalysisValidator(
            min_summary_words=config.analysis.min_summary_words,
            min_insight_words=config.analysis.min_insight_words,
        )

        pipeline = AnalysisPipeline(
            repository=repository,
            analyzer=analyzer,
            validator=validator,
            llm_client=llm_client,
            min_content_chars=config.analysis.min_content_chars,
        )

        pipeline.run(batch_size=config.analysis.batch_size)
    except VeillIAError as exc:
        logger.error("Fatal error: %s", exc)
        return 1
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected fatal error")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
