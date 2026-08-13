"""
collectors/civica.py
----------------------
Collector for AI-related opportunities from civica.ma's public
Opportunities listing (https://www.civica.ma/ -- a Moroccan
civic-opportunities platform, recently rebranded from beken.org).

No RSS feed or public API was found for this site at the time this
collector was written, so -- like `AnthropicCollector` -- it implements
`BaseCollector` directly and does best-effort HTML parsing instead.
Same caveats apply: if Civica changes its page markup, this collector
may return fewer items or none at all; it degrades gracefully (log a
warning, return whatever could be parsed) rather than crash.

Civica lists opportunities across every domain (civic engagement,
youth programs, training, ...), not just AI ones, and posts are mostly
in Arabic with some French, so every candidate item is run through
`utils.ai_relevance.is_ai_relevant` (which matches Arabic AI terms as
well as English/French -- see that module) before becoming an
`Article`.

Confidence note: unlike Technopark and mmsp.gov.ma (whose agenda/
actualités listing pages were fetched and inspected while writing this
collector), civica.ma's exact listing markup could not be directly
verified. This collector uses the same structural heading+anchor
heuristic as `collectors/technopark.py`, which is a reasonable default
for card-grid listing pages, but may need a follow-up markup check
once run against the live site.

Schema note: results are tagged with `utils.ai_relevance.classify_type`
rather than adding new fields to the `Article` model, per the project's
schema decision.
"""

from __future__ import annotations

import re
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

# Known static/navigation paths, not individual opportunity posts.
_NON_OPPORTUNITY_PATH_PREFIXES = (
    "/login",
    "/register",
    "/signup",
    "/about",
    "/contact",
    "/opportunities",
    "/fr",
    "/ar",
    "/en",
)

_ARABIC_RE = re.compile(r"[\u0600-\u06FF]")


class CivicaCollector(BaseCollector):
    """Best-effort collector for AI-related civica.ma opportunities (no RSS available)."""

    source_name = "Civica"

    def collect(self) -> list[Article]:
        html = self._fetch_page()
        if html is None:
            return []

        try:
            articles = self._parse_opportunities(html)
        except Exception as exc:  # noqa: BLE001 - never crash the whole run
            logger.error("%s: failed to parse opportunities page: %s", self.source_name, exc)
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

    def _parse_opportunities(self, html: str) -> list[Article]:
        soup = BeautifulSoup(html, "html.parser")
        articles: list[Article] = []
        seen_urls: set[str] = set()

        candidates = []
        for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
            anchor = heading.find("a", href=True)
            if anchor is not None:
                candidates.append((anchor, heading))
        # Fallback: some card grids link the whole card without a
        # heading tag at all -- catch plain anchors with substantial
        # text as a second pass if the heading-based pass finds nothing.
        if not candidates:
            for anchor in soup.find_all("a", href=True):
                if len(normalize_whitespace(anchor.get_text(separator=" ")) or "") > 15:
                    candidates.append((anchor, anchor))

        for anchor, context_node in candidates:
            href = anchor["href"]
            absolute_url = urljoin(self.url, href)

            if "civica.ma" not in absolute_url:
                continue
            path = absolute_url.split("civica.ma", 1)[-1]
            if any(path.startswith(prefix) for prefix in _NON_OPPORTUNITY_PATH_PREFIXES):
                continue
            if absolute_url in seen_urls:
                continue

            title = normalize_whitespace(anchor.get_text(separator=" "))
            if not title:
                continue

            blob_parts = [title]
            for sibling in context_node.find_next_siblings(limit=3):
                text = normalize_whitespace(sibling.get_text(separator=" "))
                if text:
                    blob_parts.append(text)
            blob = " ".join(blob_parts)

            if not is_ai_relevant(title, blob):
                continue

            published_at = extract_date(blob)
            summary = truncate(blob, max_length=500)
            language = "ar" if _ARABIC_RE.search(title) else "fr"

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
                    language=language,
                    tags=[classify_type(title, blob)],
                )
            )

            if len(articles) >= self.max_articles:
                break

        if not articles:
            logger.warning(
                "%s: no AI-relevant opportunities could be extracted -- the page "
                "markup may have changed, or may differ from the heuristic this "
                "collector assumes (see module docstring)",
                self.source_name,
            )

        return articles