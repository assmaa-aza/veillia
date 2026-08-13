"""
collectors/base.py
-------------------
Defines the abstract interface that every news-source collector must
implement, plus a `RSSCollector` base class that implements the common
"fetch RSS feed -> parse entries -> build Article" workflow shared by
most sources (OpenAI, Google AI, Hugging Face, TechCrunch, ...).

Why an abstract base class?
----------------------------
- Guarantees every collector exposes the same `collect()` contract,
  so `main.py` (and later the VeillIA backend) can treat all sources
  polymorphically: `for collector in collectors: collector.collect()`.
- Encodes shared, boilerplate-y behaviour (HTTP fetching, error
  handling, per-source article capping) once, instead of duplicating
  it in every source-specific file.
- Adding a brand-new RSS source later is typically a ~15-line subclass;
  adding a completely different kind of source (HTML scraping, a JSON
  API, ...) just means implementing `collect()` directly against
  `BaseCollector`.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import feedparser
import requests

import config
from models.article import Article
from utils.cleaner import clean_tags, strip_html, truncate
from utils.full_text import fetch_full_text
from utils.logger import get_logger
from utils.parser import extract_image_from_entry, first_present, parse_date

logger = get_logger(__name__)


class BaseCollector(ABC):
    """Abstract interface every news-source collector must implement."""

    #: Human-readable name of the source. Must be overridden by subclasses.
    source_name: str = "Unknown Source"

    def __init__(self, url: str, max_articles: int | None = None):
        self.url = url
        # Per-source cap, falling back to the global config default when
        # not explicitly set. This lets high-volume sources (e.g. arXiv,
        # which can publish dozens of papers a day) be capped tighter
        # than the rest without a special case anywhere else in the code.
        self.max_articles = max_articles if max_articles is not None else config.MAX_ARTICLES_PER_SOURCE

    @abstractmethod
    def collect(self) -> list[Article]:
        """Fetch and return a list of normalized `Article` objects.

        Implementations MUST NOT raise on recoverable errors (network
        issues, malformed feed, etc.) -- they should log the problem and
        return an empty list instead, so that a single failing source
        never crashes the whole pipeline run.
        """
        raise NotImplementedError


class RSSCollector(BaseCollector):
    """Base class for collectors backed by a standard RSS/Atom feed.

    Subclasses typically only need to set `source_name` and, if the
    feed exposes source-specific quirks, override `_extract_content`
    or `_extract_tags`.
    """

    source_name: str = "RSS Source"

    def collect(self) -> list[Article]:
        """Download and parse the RSS feed, returning normalized articles."""
        feed = self._fetch_feed()
        if feed is None:
            return []

        articles: list[Article] = []
        entries = feed.entries[: self.max_articles]

        for entry in entries:
            try:
                article = self._entry_to_article(entry)
                if article.is_valid():
                    articles.append(article)
                else:
                    logger.warning(
                        "%s: skipping entry with missing title/url", self.source_name
                    )
            except Exception as exc:  # noqa: BLE001 - never let one bad entry crash the run
                logger.error(
                    "%s: failed to parse entry (%s): %s", self.source_name, entry.get("link"), exc
                )

        logger.info("%s: collected %d article(s)", self.source_name, len(articles))
        return articles

    # ------------------------------------------------------------------
    # Internal helpers (safe to override in subclasses if a feed needs
    # source-specific handling).
    # ------------------------------------------------------------------

    def _fetch_feed(self):
        """Download the raw feed bytes over HTTP and parse them with
        feedparser. Returns None (and logs) on any failure so the caller
        can gracefully skip this source.
        """
        try:
            response = requests.get(
                self.url,
                timeout=config.REQUEST_TIMEOUT_SECONDS,
                headers={"User-Agent": config.USER_AGENT},
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("%s: failed to fetch feed at %s: %s", self.source_name, self.url, exc)
            return None

        feed = feedparser.parse(response.content)

        # feedparser sets `bozo=1` for malformed feeds but still tries its
        # best to parse what it can -- we log a warning but keep going,
        # since partial data is often better than none.
        if feed.bozo and not feed.entries:
            logger.error(
                "%s: feed at %s is malformed and unparsable: %s",
                self.source_name,
                self.url,
                feed.get("bozo_exception"),
            )
            return None
        if feed.bozo:
            logger.warning(
                "%s: feed at %s parsed with warnings: %s",
                self.source_name,
                self.url,
                feed.get("bozo_exception"),
            )

        return feed

    def _entry_to_article(self, entry) -> Article:
        """Convert a single feedparser entry into a normalized `Article`."""
        title = strip_html(entry.get("title"))
        url = entry.get("link")
        author = entry.get("author")

        published_at = parse_date(
            raw_date=first_present(entry.get("published"), entry.get("updated")),
            parsed_struct=first_present(
                entry.get("published_parsed"), entry.get("updated_parsed")
            ),
        )

        summary_raw = entry.get("summary")
        summary = truncate(strip_html(summary_raw), max_length=500)
        content = self._extract_content(entry)
        image_url = extract_image_from_entry(entry)
        tags = clean_tags(entry.get("tags"))

        # The feed itself usually only exposes an excerpt. When enabled,
        # visit the real article page and extract its actual body --
        # this is what makes `content` meaningfully richer than
        # `summary` instead of frequently being identical to it.
        if config.FETCH_FULL_CONTENT and url:
            full_text = fetch_full_text(url)
            if full_text:
                content = full_text

        return Article(
            title=title,
            url=url,
            source=self.source_name,
            author=author,
            published_at=published_at,
            summary=summary,
            content=content,
            image_url=image_url,
            language="en",
            tags=tags,
        )

    def _extract_content(self, entry) -> str | None:
        """Extract the fullest available body text from an entry.

        Most feeds expose either a `content` list (Atom-style, full body)
        or fall back to `summary` (RSS-style, often an excerpt). We prefer
        the richer field when available.
        """
        content_list = entry.get("content")
        if content_list:
            raw = content_list[0].get("value")
            cleaned = strip_html(raw)
            if cleaned:
                return cleaned
        return strip_html(entry.get("summary"))
