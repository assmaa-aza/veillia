"""
collectors/technopark.py
--------------------------
Collector for AI-related events from Technopark Maroc's public agenda
page (https://www.technopark.ma/agenda/).

No RSS feed was found for this WordPress site at the time this
collector was written, so -- like `AnthropicCollector` -- it implements
`BaseCollector` directly and does best-effort HTML parsing of the
public agenda listing instead of feed parsing. Same caveats apply: if
Technopark changes its page markup, this collector may return fewer
events or none at all; it degrades gracefully (log a warning, return
whatever could be parsed) rather than crash.

Technopark's agenda covers every kind of startup/entrepreneurship event
across its five sites (workshops, afterworks, training, ...), not just
AI ones, so every candidate item is run through
`utils.ai_relevance.is_ai_relevant` before becoming an `Article`.

Structural note: rather than hardcoding WordPress theme-specific CSS
classes (which are liable to change on the next theme update, and
which couldn't be verified against live markup while writing this
collector -- see the caveats above), event cards are located
structurally: each agenda entry renders its title inside a heading tag
(h4/h5/h6) wrapping a link, which is a stable-enough pattern across
WordPress themes in general even if exact class names drift.

Schema note: results are tagged with `utils.ai_relevance.classify_type`
rather than adding new fields to the `Article` model, per the project's
schema decision.
"""

from __future__ import annotations

from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

import config
from collectors.base import BaseCollector
from models.article import Article
from utils.ai_relevance import classify_type, is_ai_relevant
from utils.cleaner import normalize_whitespace, truncate
from utils.data_extract import extract_date
from utils.full_text import fetch_article
from utils.logger import get_logger

logger = get_logger(__name__)

# Known static/navigation paths on technopark.ma that are NOT agenda
# entries, even though they may also appear wrapped in a heading tag
# somewhere on the page (e.g. section titles, footer nav). Anchors
# pointing here are always skipped.
_NON_EVENT_PATH_PREFIXES = (
    "/technopark",
    "/services",
    "/start-ups",
    "/media",
    "/reseau",
    "/agenda",
    "/evenment",
    "/category/",
    "/mot-de-",
)


class TechnoparkCollector(BaseCollector):
    """Best-effort collector for AI-related Technopark Maroc events (no RSS available)."""

    source_name = "Technopark"

    def collect(self) -> list[Article]:
        html = self._fetch_page()
        if html is None:
            return []

        try:
            articles = self._parse_events(html)
        except Exception as exc:  # noqa: BLE001 - never crash the whole run
            logger.error("%s: failed to parse agenda page: %s", self.source_name, exc)
            return []

        logger.info("%s: collected %d article(s)", self.source_name, len(articles))
        return articles

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _fetch_page(self) -> str | None:
        try:
            response = requests.get(
                self.url,
                timeout=config.REQUEST_TIMEOUT_SECONDS,
                headers={"User-Agent": config.USER_AGENT},
            )
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            logger.error("%s: failed to fetch %s: %s", self.source_name, self.url, exc)
            return None

    def _parse_events(self, html: str) -> list[Article]:
        soup = BeautifulSoup(html, "html.parser")
        articles: list[Article] = []
        seen_urls: set[str] = set()

        for heading in soup.find_all(["h3", "h4", "h5", "h6"]):
            anchor = heading.find("a", href=True)
            if anchor is None:
                continue

            href = anchor["href"]
            absolute_url = urljoin(self.url, href)

            # Only keep links back to technopark.ma itself, and skip
            # known static/navigation pages (see module docstring).
            if "technopark.ma" not in absolute_url:
                continue
            path = absolute_url.split("technopark.ma", 1)[-1]
            if any(path.startswith(prefix) for prefix in _NON_EVENT_PATH_PREFIXES):
                continue
            if absolute_url in seen_urls:
                continue

            title = normalize_whitespace(anchor.get_text(separator=" "))
            if not title:
                continue

            # The date/category/excerpt for this card render as sibling
            # elements right after the heading, mirroring the structure
            # observed on the live agenda page (title heading, then a
            # date line, then a category link, then an excerpt).
            blob_parts = [title]
            for sibling in heading.find_next_siblings(limit=3):
                text = normalize_whitespace(sibling.get_text(separator=" "))
                if text:
                    blob_parts.append(text)
            blob = " ".join(blob_parts)

            if not is_ai_relevant(title, blob):
                continue

            published_at = extract_date(blob)
            summary = truncate(blob, max_length=500)

            content = None
            image_url = None
            if config.FETCH_FULL_CONTENT:
                content, image_url = fetch_article(absolute_url)

            seen_urls.add(absolute_url)
            articles.append(
                Article(
                    title=title,
                    url=absolute_url,
                    source=self.source_name,
                    author=None,
                    published_at=published_at,
                    summary=summary,
                    content=content,
                    image_url=image_url,
                    language="fr",
                    tags=[classify_type(title, blob)],
                )
            )

            if len(articles) >= self.max_articles:
                break

        if not articles:
            logger.warning(
                "%s: no AI-relevant events could be extracted -- the page markup "
                "may have changed",
                self.source_name,
            )

        return articles