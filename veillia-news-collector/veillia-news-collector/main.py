#!/usr/bin/env python3
"""
main.py
-------
Entry point for the VeillIA news-collector pipeline.

Pipeline shape:

    Collector -> Normalize (Article) -> Supabase

Responsibilities of this module (and only this module):
    1. Instantiate every configured collector (see `config.SOURCES`).
    2. Run each collector, gathering all normalized `Article` objects.
    3. Deduplicate articles by URL.
    4. Persist the final list via the storage layer (Supabase by default).
    5. Print a human-readable summary of the run.

This module intentionally contains no scraping/parsing logic itself --
that all lives in `collectors/`. It also doesn't know anything about
*how* articles are stored -- that's `storage/`'s job, behind the
`BaseStorage` interface. This is what let the storage backend be swapped
from local JSON to Supabase (`storage/supabase_storage.py`) with a
one-line change in `build_storage()` below, and zero changes to any
collector.

Usage:
    python main.py
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import config
from collectors.anthropic import AnthropicCollector
from collectors.arstechnica import ArsTechnicaCollector
from collectors.arxiv import ArxivCollector
from collectors.base import BaseCollector
from collectors.civica import CivicaCollector
from collectors.devpost import DevpostCollector
from collectors.google_ai import GoogleAICollector
from collectors.huggingface import HuggingFaceCollector
from collectors.marktechpost import MarkTechPostCollector
from collectors.meetup import MeetupCollector
from collectors.mit_tech_review import MITTechReviewCollector
from collectors.mmsp import MMSPCollector
from collectors.openai import OpenAICollector
from collectors.techcrunch import TechCrunchAICollector
from collectors.technopark import TechnoparkCollector
from collectors.theverge import TheVergeCollector
from models.article import Article
from storage.base import BaseStorage
from storage.json_storage import JSONStorage
from storage.supabase_storage import SupabaseStorage
from utils.logger import get_logger

logger = get_logger(__name__)

# Maps each `config.SOURCES` entry's "name" to the collector class that
# knows how to handle it. This is the single place that needs to be
# updated when a brand-new source is added to `config.py`.
COLLECTOR_REGISTRY: dict[str, type[BaseCollector]] = {
    "OpenAI": OpenAICollector,
    "Anthropic": AnthropicCollector,
    "Google AI": GoogleAICollector,
    "Hugging Face": HuggingFaceCollector,
    "TechCrunch AI": TechCrunchAICollector,
    "The Verge AI": TheVergeCollector,
    "MIT Technology Review AI": MITTechReviewCollector,
    "MarkTechPost": MarkTechPostCollector,
    "Ars Technica AI": ArsTechnicaCollector,
    "arXiv cs.AI": ArxivCollector,
    # Events / competitions / opportunities (see config.py's "Events /
    # competitions / opportunities" section for source details).
    "Devpost": DevpostCollector,
    "Meetup": MeetupCollector,
    "MMSP": MMSPCollector,
    "Technopark": TechnoparkCollector,
    "Civica": CivicaCollector,
}


@dataclass
class RunSummary:
    """Aggregated statistics about a single pipeline run."""

    sources_total: int = 0
    sources_succeeded: int = 0
    sources_failed: int = 0
    articles_collected: int = 0
    duplicates_removed: int = 0
    elapsed_seconds: float = 0.0

    def print_report(self) -> None:
        print("\n" + "=" * 50)
        print("VeillIA News Collector -- Run Summary")
        print("=" * 50)
        print(f"Sources processed     : {self.sources_total}")
        print(f"  - succeeded          : {self.sources_succeeded}")
        print(f"  - failed              : {self.sources_failed}")
        print(f"Articles collected     : {self.articles_collected}")
        print(f"Duplicates removed     : {self.duplicates_removed}")
        print(f"Processing time        : {self.elapsed_seconds:.2f}s")
        print("=" * 50 + "\n")


def build_collectors() -> list[BaseCollector]:
    """Instantiate one collector per entry in `config.SOURCES`.

    Sources whose name isn't found in `COLLECTOR_REGISTRY` are skipped
    with a warning rather than crashing the whole run -- this way a
    typo or half-configured new source doesn't take down the pipeline.
    """
    collectors: list[BaseCollector] = []
    for source in config.SOURCES:
        collector_cls = COLLECTOR_REGISTRY.get(source["name"])
        if collector_cls is None:
            logger.warning(
                "No collector registered for source '%s' -- skipping.", source["name"]
            )
            continue
        collectors.append(
            collector_cls(url=source["url"], max_articles=source.get("max_articles"))
        )
    return collectors


def build_storage() -> BaseStorage:
    """Instantiate the configured storage backend.

    Defaults to Supabase (`config.STORAGE_BACKEND == "supabase"`). Set
    `STORAGE_BACKEND=json` in `.env` to fall back to the local JSON file
    backend instead -- useful for quick local testing without a Supabase
    project on hand. This is the single place that needs to change to
    add a third backend later.
    """
    if config.STORAGE_BACKEND == "json":
        logger.info("Using local JSON storage backend (%s)", config.OUTPUT_FILE)
        return JSONStorage(config.OUTPUT_FILE)

    if config.STORAGE_BACKEND == "supabase":
        logger.info(
            "Using Supabase storage backend (table: '%s')", config.SUPABASE_TABLE
        )
        return SupabaseStorage(
            url=config.SUPABASE_URL,
            key=config.SUPABASE_KEY,
            table=config.SUPABASE_TABLE,
        )

    raise ValueError(
        f"Unknown STORAGE_BACKEND '{config.STORAGE_BACKEND}'. "
        "Expected 'supabase' or 'json'."
    )


def deduplicate(articles: list[Article]) -> tuple[list[Article], int]:
    """Remove duplicate articles based on URL, keeping the first occurrence.

    Returns:
        A tuple of (deduplicated_articles, number_of_duplicates_removed).
    """
    seen_urls: set[str] = set()
    unique: list[Article] = []
    duplicates = 0

    for article in articles:
        # Normalize trivially (strip trailing slash) so cosmetic URL
        # differences don't produce false "unique" duplicates.
        key = (article.url or "").rstrip("/")
        if not key:
            continue
        if key in seen_urls:
            duplicates += 1
            continue
        seen_urls.add(key)
        unique.append(article)

    return unique, duplicates


def run_pipeline() -> RunSummary:
    """Run the full collection pipeline once and return a `RunSummary`."""
    start_time = time.perf_counter()
    summary = RunSummary()

    # Build (and validate) the storage backend BEFORE running any
    # collectors. This fails fast on missing/invalid Supabase credentials
    # instead of burning time on network fetches only to discover at the
    # very end that the results have nowhere to go.
    storage = build_storage()

    collectors = build_collectors()
    summary.sources_total = len(collectors)

    all_articles: list[Article] = []
    for collector in collectors:
        try:
            articles = collector.collect()
            all_articles.extend(articles)
            summary.sources_succeeded += 1
        except Exception as exc:  # noqa: BLE001 - one bad source shouldn't kill the run
            logger.error("Collector for '%s' failed unexpectedly: %s", collector.source_name, exc)
            summary.sources_failed += 1

    deduplicated, duplicates_removed = deduplicate(all_articles)

    storage.save(deduplicated)

    summary.articles_collected = len(deduplicated)
    summary.duplicates_removed = duplicates_removed
    summary.elapsed_seconds = time.perf_counter() - start_time

    return summary


def main() -> None:
    logger.info("Starting VeillIA news collection run...")
    try:
        summary = run_pipeline()
    except ValueError as exc:
        # Raised by build_storage() on missing/invalid configuration --
        # a clean, actionable message beats a raw traceback here.
        logger.error("Pipeline aborted: %s", exc)
        raise SystemExit(1) from exc

    summary.print_report()


if __name__ == "__main__":
    main()