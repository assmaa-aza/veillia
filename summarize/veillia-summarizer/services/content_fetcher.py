"""Fetches the full text of an article directly from its page, as a
fallback when what's stored in `articles.content` is too short to
meaningfully analyze (e.g. an RSS teaser instead of the full article body).

Kept independent of any specific pipeline (Single Responsibility): any
pipeline that needs richer content -- analysis today, potentially
summarization or classification later -- can reuse the same interface.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class ContentFetcher(ABC):
    """Interface for anything that can retrieve an article's full text from its URL."""

    @abstractmethod
    def fetch(self, url: str) -> str | None:
        """Return the extracted main text of the page at `url`, or None on failure.

        Never raises for ordinary failures (timeout, 404, unparseable page)
        -- callers treat None as "fetch didn't help, fall back to what we
        already have".
        """
        raise NotImplementedError


class TrafilaturaContentFetcher(ContentFetcher):
    """Downloads a page and extracts its main article text using trafilatura.

    trafilatura is a free, local, pure-Python library (no API key, no paid
    service) that strips navigation, ads, and boilerplate to isolate the
    actual article body -- much closer to what a summarizer/analyzer should
    read than a raw HTML dump or a short RSS snippet.
    """

    def __init__(self, timeout_seconds: int = 15) -> None:
        self._timeout_seconds = timeout_seconds

    def fetch(self, url: str) -> str | None:
        if not url or not url.strip():
            return None

        # Imported lazily so environments that never use this fetcher don't
        # pay the import cost, and so a missing dependency only breaks the
        # feature that needs it rather than the whole module.
        import trafilatura

        try:
            downloaded = trafilatura.fetch_url(url, timeout=self._timeout_seconds)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to download %s: %s", url, exc)
            return None

        if not downloaded:
            logger.warning("No content downloaded from %s", url)
            return None

        try:
            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=False,
                favor_precision=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to extract article text from %s: %s", url, exc)
            return None

        return extracted.strip() if extracted else None
