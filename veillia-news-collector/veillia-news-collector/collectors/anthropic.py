"""
collectors/anthropic.py
-------------------------
Collector for Anthropic News.

Unlike the other initial sources, Anthropic does not currently publish a
public RSS/Atom feed for https://www.anthropic.com/news (verified at the
time this collector was written). To keep Anthropic in the source list
without breaking the "RSS whenever available" principle for the *other*
sources, this collector implements `BaseCollector` directly (instead of
`RSSCollector`) and does lightweight, best-effort HTML parsing of the
public news page.

Important caveats (documented deliberately, not hidden):
    - This is inherently more fragile than RSS parsing: if Anthropic
      changes their page markup, this collector may return fewer
      articles or none at all. It is written defensively so that a
      markup change degrades gracefully (logs a warning, returns
      whatever it could parse) instead of crashing the whole pipeline.
    - The index page itself only exposes title, url, published date,
      and category-as-tag. `content` and `image_url` are filled in by
      visiting each article's own page when `config.FETCH_FULL_CONTENT`
      is enabled (the default) -- see `utils/full_text.py`. With that
      setting off, those two fields fall back to `None`. `author` is
      still always `None`, since Anthropic's article pages don't
      expose a byline.
    - If Anthropic ever publishes an official RSS feed, replace the
      implementation below with an `RSSCollector` subclass (see
      `collectors/openai.py` for a minimal example) -- no other file
      in the project needs to change.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

import config
from collectors.base import BaseCollector
from models.article import Article
from utils.cleaner import normalize_whitespace
from utils.full_text import fetch_article
from utils.logger import get_logger
from utils.parser import parse_date

logger = get_logger(__name__)

# Known category labels used on the Anthropic newsroom index. Used to
# separate the "category" portion from the "title" portion of an
# anchor's combined text (e.g. "Jul 9, 2026Announcements Inviting hard
# questions" -> date="Jul 9, 2026", category="Announcements",
# title="Inviting hard questions").
_KNOWN_CATEGORIES = [
    "Announcements",
    "Product",
    "Features",
    "Case Study",
    "Policy",
    "Societal Impacts",
    "Research",
    "Product News",
]

# Matches a leading date like "Jul 9, 2026" or "Jul 09, 2026".
_DATE_PREFIX_RE = re.compile(r"^([A-Z][a-z]{2} \d{1,2},\s*\d{4})")


class AnthropicCollector(BaseCollector):
    """Best-effort collector for Anthropic's newsroom page (no RSS available)."""

    source_name = "Anthropic"

    def collect(self) -> list[Article]:
        html = self._fetch_page()
        if html is None:
            return []

        try:
            articles = self._parse_articles(html)
        except Exception as exc:  # noqa: BLE001 - never crash the whole run
            logger.error("%s: failed to parse newsroom page: %s", self.source_name, exc)
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
            href = anchor["href"]

            # Only keep links that point to an actual news article, i.e.
            # "/news/<slug>", not the nav link to "/news" itself.
            if not href.startswith("/news/"):
                continue

            absolute_url = urljoin(self.url, href)
            if absolute_url in seen_urls:
                continue

            text = normalize_whitespace(anchor.get_text(separator=" "))
            if not text:
                continue

            title, category, published_at = self._split_anchor_text(text)
            if not title:
                continue

            # The index page itself has no body text or summary -- only
            # title/date/category. Visit the article's own page (once)
            # to get its actual content and cover image, same as
            # RSS-based collectors do when FETCH_FULL_CONTENT is on.
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
                    summary=None,
                    content=content,
                    image_url=image_url,
                    language="en",
                    tags=[category] if category else [],
                )
            )

            if len(articles) >= self.max_articles:
                break

        if not articles:
            logger.warning(
                "%s: no articles could be extracted -- the page markup may have changed",
                self.source_name,
            )

        return articles

    @staticmethod
    def _split_anchor_text(text: str) -> tuple[str | None, str | None, str | None]:
        """Split a raw anchor text blob into (title, category, published_at).

        The Anthropic newsroom index tends to render each list item's
        link text as a concatenation of "<date><category> <title>"
        with no separator, e.g. "Jul 9, 2026Announcements Inviting hard
        questions". We peel off the recognizable date and category
        prefixes and treat whatever remains as the title.
        """
        remainder = text
        published_at = None

        date_match = _DATE_PREFIX_RE.match(remainder)
        if date_match:
            raw_date = date_match.group(1)
            published_at = parse_date(raw_date=raw_date)
            remainder = remainder[date_match.end():].strip()

        category = None
        for cat in _KNOWN_CATEGORIES:
            if remainder.startswith(cat):
                category = cat
                remainder = remainder[len(cat):].strip()
                break

        title = remainder.strip() or None
        return title, category, published_at
