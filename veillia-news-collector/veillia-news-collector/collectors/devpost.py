"""
collectors/devpost.py
-----------------------
Collector for AI-related hackathons and challenges on Devpost.

Devpost doesn't publish RSS, but it does expose a public, unauthenticated
JSON endpoint (`https://devpost.com/api/hackathons`) that the Devpost
website itself uses to render its own hackathon-listing pages -- no
login, no API key, no scraping of rendered HTML required. This makes it
the cleanest of the five new sources: unlike Meetup/mmsp.gov.ma/
Technopark/Civica (which need best-effort HTML parsing, see
`collectors/anthropic.py` for that pattern), this collector talks to a
real JSON API directly, much like `RSSCollector` talks to a real feed.

Because Devpost hosts hackathons on every topic, not just AI, this
collector queries the API with a handful of AI-related search terms and
still runs every result through `utils.ai_relevance.is_ai_relevant` as a
second pass -- Devpost's `search` param does a fuzzy full-text match
against sponsor names, prize descriptions, etc., so a search for
"artificial intelligence" can occasionally surface an unrelated result.

Schema note: per the project's schema decision, hackathons are stored as
ordinary `Article` objects with `tags=["Competition", ...]` -- no new
fields were added to the `Article` model (see README > The Article
schema). Prize/deadline/theme details are folded into `summary`/
`content` as text, same as how AnthropicCollector folds its category
into `tags` while everything else stays plain text.
"""

from __future__ import annotations

import requests

import config
from collectors.base import BaseCollector
from models.article import Article
from utils.ai_relevance import is_ai_relevant
from utils.cleaner import normalize_whitespace, strip_html
from utils.full_text import fetch_article
from utils.logger import get_logger

logger = get_logger(__name__)

API_URL = "https://devpost.com/api/hackathons"

# Queried separately and merged/deduplicated, since Devpost's search is
# a single free-text field rather than a boolean OR of terms.
_SEARCH_TERMS = ["artificial intelligence", "machine learning"]


def _first(data: dict, *keys):
    """Return the first present value among several possible key spellings.

    The Devpost API's exact casing (snake_case vs camelCase) isn't
    documented publicly and could plausibly differ by field, so every
    lookup here tries both rather than assuming one -- consistent with
    this collector's overall "degrade gracefully on shape drift" stance.
    """
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return None


class DevpostCollector(BaseCollector):
    """Collector for AI-related hackathons/challenges on Devpost."""

    source_name = "Devpost"

    def collect(self) -> list[Article]:
        raw_hackathons = self._fetch_all()
        if not raw_hackathons:
            return []

        articles: list[Article] = []
        seen_urls: set[str] = set()

        for raw in raw_hackathons:
            try:
                article = self._to_article(raw)
            except Exception as exc:  # noqa: BLE001 - one bad entry shouldn't crash the run
                logger.error("%s: failed to parse a hackathon entry: %s", self.source_name, exc)
                continue

            if not article or not article.is_valid():
                continue
            if article.url in seen_urls:
                continue
            if not is_ai_relevant(article.title, article.summary, " ".join(article.tags)):
                continue

            seen_urls.add(article.url)
            articles.append(article)

            if len(articles) >= self.max_articles:
                break

        logger.info("%s: collected %d article(s)", self.source_name, len(articles))
        return articles

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _fetch_all(self) -> list[dict]:
        """Query the API once per AI-related search term and merge results."""
        merged: list[dict] = []
        seen_ids: set = set()

        for term in _SEARCH_TERMS:
            for raw in self._fetch_one(term):
                identifier = _first(raw, "id") or _first(raw, "url")
                if identifier in seen_ids:
                    continue
                seen_ids.add(identifier)
                merged.append(raw)

        return merged

    def _fetch_one(self, search_term: str) -> list[dict]:
        try:
            response = requests.get(
                API_URL,
                params={
                    "search": search_term,
                    "order_by": "recently-added",
                    "page": 1,
                },
                timeout=config.REQUEST_TIMEOUT_SECONDS,
                headers={"User-Agent": config.USER_AGENT},
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error(
                "%s: failed to query API for %r: %s", self.source_name, search_term, exc
            )
            return []

        try:
            data = response.json()
        except ValueError as exc:
            logger.error("%s: API returned non-JSON response: %s", self.source_name, exc)
            return []

        hackathons = data.get("hackathons") or data.get("results") or []
        if not isinstance(hackathons, list):
            logger.warning(
                "%s: unexpected API response shape for %r -- the API may have changed",
                self.source_name,
                search_term,
            )
            return []

        return hackathons

    def _to_article(self, raw: dict) -> Article | None:
        title = normalize_whitespace(_first(raw, "title"))
        url = _first(raw, "url")
        if not title or not url:
            return None

        organization = _first(raw, "organization_name", "organizationName")
        themes_raw = _first(raw, "themes") or []
        theme_names = []
        for theme in themes_raw:
            if isinstance(theme, dict):
                name = theme.get("name")
            else:
                name = theme
            if name:
                theme_names.append(str(name))

        prize = strip_html(_first(raw, "prize_amount", "prizeAmount"))
        dates = _first(raw, "submission_period_dates", "submissionPeriodDates")
        time_left = _first(raw, "time_left_to_submission", "timeLeftToSubmission")
        location = _first(raw, "location")

        summary_parts = []
        if prize:
            summary_parts.append(f"Prize: {prize}")
        if dates:
            summary_parts.append(f"Dates: {dates}")
        if time_left:
            summary_parts.append(time_left)
        if location:
            summary_parts.append(location)
        if theme_names:
            summary_parts.append("Themes: " + ", ".join(theme_names))
        summary = " · ".join(summary_parts) or None

        # The list API only returns summary-level fields (see docstring);
        # visit the hackathon's own page for its actual description and
        # a cover image, same enrichment step every other collector does.
        content = summary
        image_url = _first(raw, "thumbnail_url", "thumbnailUrl")
        if config.FETCH_FULL_CONTENT:
            full_text, page_image = fetch_article(url)
            if full_text:
                content = full_text
            if page_image and not image_url:
                image_url = page_image

        tags = ["Competition"] + theme_names

        return Article(
            title=title,
            url=url,
            source=self.source_name,
            author=organization,
            published_at=None,
            summary=summary,
            content=content,
            image_url=image_url,
            language="en",
            tags=tags,
        )