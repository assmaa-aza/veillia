"""
collectors/mmsp.py
--------------------
Collector for AI-related items from the Moroccan Ministère de la
Transition Numérique et de la Réforme de l'Administration (mmsp.gov.ma)
"actualités" (news) section.

No public RSS feed was found for this site at the time this collector
was written, so -- exactly like `AnthropicCollector` -- it implements
`BaseCollector` directly and does best-effort HTML parsing of the
public actualités listing pages instead. Same caveats apply: if the
ministry's site changes its page markup, this collector may return
fewer items or none at all; it's written to degrade gracefully (log a
warning, return whatever could be parsed) rather than crash.

This is a general-purpose government news feed (announcements, staff
appointments, recruitment notices, ceremonies, ...), not an AI-specific
one, so every candidate item is run through
`utils.ai_relevance.is_ai_relevant` before becoming an `Article` --
only items actually about AI (e.g. "Assises Nationales de l'Intelligence
Artificielle", AI-training programs, AI cooperation agreements) survive.

Schema note: results are tagged with `utils.ai_relevance.classify_type`
(one of "Event", "Competition", "Opportunity") rather than adding new
fields to the `Article` model, per the project's schema decision.
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

# Matches an actualité permalink like "/fr/actualites/some-article-slug",
# but not the index itself ("/fr/actualites") or paginated index links
# ("/fr/actualites?page=2").
_ARTICLE_HREF_RE = re.compile(r"^/(fr|ar)/actualites/[^?]+")


class MMSPCollector(BaseCollector):
    """Best-effort collector for AI-related mmsp.gov.ma news (no RSS available)."""

    source_name = "MMSP"

    def collect(self) -> list[Article]:
        html = self._fetch_page()
        if html is None:
            return []

        try:
            articles = self._parse_articles(html)
        except Exception as exc:  # noqa: BLE001 - never crash the whole run
            logger.error("%s: failed to parse actualités page: %s", self.source_name, exc)
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

    def _parse_articles(self, html: str) -> list[Article]:
        soup = BeautifulSoup(html, "html.parser")
        articles: list[Article] = []
        seen_urls: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            path = anchor["href"].split("?", 1)[0]
            if not _ARTICLE_HREF_RE.match(path):
                continue

            absolute_url = urljoin(self.url, path)
            if absolute_url in seen_urls:
                continue

            title = normalize_whitespace(anchor.get_text(separator=" "))
            if not title:
                continue

            container = anchor.find_parent(["article", "li", "div"]) or anchor
            blob = normalize_whitespace(container.get_text(separator=" ")) or title

            if not is_ai_relevant(title, blob):
                continue

            published_at = extract_date(blob)
            summary = truncate(blob if blob != title else None, max_length=500)

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
                "%s: no AI-relevant articles could be extracted -- the page markup "
                "may have changed",
                self.source_name,
            )

        return articles