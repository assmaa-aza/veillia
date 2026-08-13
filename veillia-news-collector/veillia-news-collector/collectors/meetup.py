"""
collectors/meetup.py
----------------------
Collector for AI-related events on Meetup.

Unlike Devpost, Meetup does NOT have a usable public API: its open REST
API was retired, and what replaced it (a GraphQL API) is gated behind
OAuth plus a paid "Meetup Pro" plan -- there is no free, self-serve way
to query public events programmatically anymore. This collector
therefore implements `BaseCollector` directly and does best-effort HTML
parsing of Meetup's public event-search pages, following exactly the
same pattern (and the same caveats) as `AnthropicCollector` for the
existing pipeline:

    - This is inherently more fragile than a real API/RSS feed: if
      Meetup changes its page markup (or tightens bot-detection on
      plain HTTP requests), this collector may return fewer events or
      none at all. It's written to degrade gracefully -- log a
      warning, return whatever could be parsed -- rather than crash.
    - Configure `url` (see `config.SOURCES`) as a Meetup event-search
      URL, e.g.:
        "https://www.meetup.com/find/?keywords=artificial+intelligence&source=EVENTS"
      Swap in whatever keyword/location combination is most relevant;
      this collector applies its own AI-relevance filter on top
      regardless, so the URL's own keyword filter mainly narrows the
      volume of pages fetched.
    - If Meetup ever ships a usable public API again, replace this
      file's `collect()` with a direct API call -- no other file in
      the project needs to change.

Schema note: every result is tagged `["Event"]` (see README > The
Article schema / project's schema decision) -- no new fields were added
to the `Article` model. Date/time/location text stays folded into
`summary` since Meetup doesn't expose a clean machine-readable date in
the page text this collector can reliably isolate.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

import config
from collectors.base import BaseCollector
from models.article import Article
from utils.ai_relevance import is_ai_relevant
from utils.cleaner import normalize_whitespace
from utils.data_extract import extract_date
from utils.full_text import fetch_article
from utils.logger import get_logger

logger = get_logger(__name__)

# Matches an event permalink like "/some-group-slug/events/123456789/".
_EVENT_HREF_RE = re.compile(r"^/[^/]+/events/\d+/?")


class MeetupCollector(BaseCollector):
    """Best-effort collector for AI-related Meetup events (no usable API)."""

    source_name = "Meetup"

    def collect(self) -> list[Article]:
        html = self._fetch_page()
        if html is None:
            return []

        try:
            articles = self._parse_events(html)
        except Exception as exc:  # noqa: BLE001 - never crash the whole run
            logger.error("%s: failed to parse event listing: %s", self.source_name, exc)
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

        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            # Strip any query string before matching the permalink shape.
            path = href.split("?", 1)[0]
            if not _EVENT_HREF_RE.match(path):
                continue

            absolute_url = urljoin(self.url, path)
            if absolute_url in seen_urls:
                continue

            title = normalize_whitespace(anchor.get_text(separator=" "))
            if not title:
                continue

            container = anchor.find_parent(["li", "article", "div"]) or anchor
            blob = normalize_whitespace(container.get_text(separator=" ")) or title

            if not is_ai_relevant(title, blob):
                continue

            published_at = extract_date(blob)

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
                    summary=blob if blob != title else None,
                    content=content,
                    image_url=image_url,
                    language="en",
                    tags=["Event"],
                )
            )

            if len(articles) >= self.max_articles:
                break

        if not articles:
            logger.warning(
                "%s: no AI-relevant events could be extracted -- the page markup may "
                "have changed, or plain HTTP requests may be getting a bot-detection "
                "page instead of real listings",
                self.source_name,
            )

        return articles