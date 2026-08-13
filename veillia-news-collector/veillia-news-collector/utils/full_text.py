"""
utils/full_text.py
--------------------
Fetches the actual article page and extracts its main body text.

Why this exists
-----------------
RSS/Atom feeds almost never contain the full article -- most publishers
deliberately truncate their feed's `<description>`/`<content:encoded>`
to a short excerpt to drive traffic to their own site. That means the
`content` field built purely from feed data (see `RSSCollector.
_extract_content` in `collectors/base.py`) is often no richer than
`summary`.

This module closes that gap: given an article's URL, it downloads the
actual page and uses `trafilatura` to pull out just the article body,
stripping navigation, headers, footers, related-article widgets, ads,
and comment sections. This is the same class of problem readability
tools (Firefox Reader View, Pocket, etc.) solve -- `trafilatura` is a
well-maintained, purpose-built library for exactly this, far more
robust than a hand-rolled BeautifulSoup heuristic.

This is used as an OPTIONAL enrichment step (see `config.
FETCH_FULL_CONTENT`), because it costs one extra HTTP request per
article on top of the feed fetch itself -- meaningfully slower, and a
few sites may rate-limit or block scraping of individual article pages
even when their RSS feed is freely accessible.
"""

from __future__ import annotations

import json

import requests
import trafilatura

import config
from utils.logger import get_logger

logger = get_logger(__name__)


def _fetch_html(url: str, timeout: int) -> str | None:
    """Download the raw HTML for `url`. Returns None on any failure."""
    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": config.USER_AGENT},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.debug("full_text: failed to fetch %s: %s", url, exc)
        return None

    content_type = response.headers.get("Content-Type", "")
    if "html" not in content_type.lower():
        logger.debug("full_text: skipping non-HTML response from %s (%s)", url, content_type)
        return None

    return response.text


def fetch_full_text(url: str, timeout: int | None = None) -> str | None:
    """Download `url` and extract its main article text.

    Returns None (and logs at debug/warning level) on any failure --
    network error, non-HTML response, or extraction failure -- so a
    single problematic article never breaks the pipeline. Callers
    should treat a None return as "keep whatever content we already
    have from the feed" rather than a fatal error.

    Args:
        url: The article's canonical URL.
        timeout: HTTP timeout in seconds. Defaults to
            `config.REQUEST_TIMEOUT_SECONDS`.

    Returns:
        The extracted plain-text article body, or None if it couldn't
        be fetched/extracted.
    """
    content, _ = fetch_article(url, timeout=timeout, with_image=False)
    return content


def fetch_article(
    url: str, timeout: int | None = None, with_image: bool = True
) -> tuple[str | None, str | None]:
    """Download `url` once and extract both its body text and cover image.

    Fetching both in a single request (rather than calling
    `fetch_full_text` and a separate image lookup) avoids hitting the
    same article URL twice -- useful for sources like Anthropic's news
    index, which has no image metadata of its own and must visit each
    article's page to get one.

    Args:
        url: The article's canonical URL.
        timeout: HTTP timeout in seconds. Defaults to
            `config.REQUEST_TIMEOUT_SECONDS`.
        with_image: If False, skips metadata/image extraction and just
            returns the body text (slightly cheaper) -- equivalent to
            calling `fetch_full_text` directly.

    Returns:
        A (content, image_url) tuple. Either or both may be None if
        extraction failed or the page didn't expose that data.
    """
    if not url:
        return None, None

    timeout = timeout if timeout is not None else config.REQUEST_TIMEOUT_SECONDS
    html = _fetch_html(url, timeout)
    if html is None:
        return None, None

    try:
        if with_image:
            raw = trafilatura.extract(
                html,
                url=url,
                include_comments=False,
                include_tables=False,
                favor_precision=True,
                with_metadata=True,
                output_format="json",
            )
            if not raw:
                return None, None
            data = json.loads(raw)
            content = data.get("text") or None
            image_url = data.get("image") or None
        else:
            content = trafilatura.extract(
                html,
                url=url,
                include_comments=False,
                include_tables=False,
                favor_precision=True,
            )
            image_url = None
    except Exception as exc:  # noqa: BLE001 - extraction should never crash the run
        logger.warning("full_text: extraction failed for %s: %s", url, exc)
        return None, None

    if content and config.FULL_CONTENT_MAX_CHARS and len(content) > config.FULL_CONTENT_MAX_CHARS:
        content = content[: config.FULL_CONTENT_MAX_CHARS].rstrip() + "…"

    if not content:
        logger.debug("full_text: no article body could be extracted from %s", url)

    return content, image_url
