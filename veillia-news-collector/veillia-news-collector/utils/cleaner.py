"""
utils/cleaner.py
-----------------
Small, dependency-light helpers to clean and normalize raw text/HTML
coming from RSS feeds or scraped pages before it is stored in an
`Article`.

Keeping these as pure functions (no side effects, no state) makes them
trivial to unit test and reuse across every collector.
"""

from __future__ import annotations

import html
import re

from bs4 import BeautifulSoup

# Matches any run of whitespace (spaces, tabs, newlines) longer than one.
_WHITESPACE_RE = re.compile(r"\s+")


def strip_html(raw_html: str | None) -> str | None:
    """Remove HTML tags and decode HTML entities from a string.

    RSS `summary`/`description` and `content` fields frequently contain
    embedded HTML (e.g. `<p>`, `<img>`, `<a>`). We want plain text for a
    clean, storage-agnostic schema.

    Args:
        raw_html: The raw string, possibly containing HTML markup.

    Returns:
        Clean plain text, or None if the input was None/empty.
    """
    if not raw_html:
        return None

    # BeautifulSoup safely strips tags even from malformed HTML fragments.
    text = BeautifulSoup(raw_html, "html.parser").get_text(separator=" ")
    text = html.unescape(text)
    text = normalize_whitespace(text)
    return text or None


def normalize_whitespace(text: str | None) -> str | None:
    """Collapse repeated whitespace/newlines into single spaces and trim."""
    if not text:
        return None
    return _WHITESPACE_RE.sub(" ", text).strip() or None


def truncate(text: str | None, max_length: int = 500) -> str | None:
    """Truncate long text to `max_length` characters, adding an ellipsis.

    Useful for generating a `summary` field when a source only provides
    full article content and no dedicated excerpt.
    """
    if not text:
        return None
    text = text.strip()
    if len(text) <= max_length:
        return text
    return text[: max_length - 1].rstrip() + "…"


def clean_tags(raw_tags: list | None) -> list[str]:
    """Normalize a list of raw tag/category objects into clean strings.

    RSS libraries sometimes return tags as plain strings, sometimes as
    dict-like objects (e.g. feedparser's `tags` with a `.term` attribute).
    This function accepts both.
    """
    if not raw_tags:
        return []

    cleaned: list[str] = []
    for tag in raw_tags:
        value = getattr(tag, "term", tag)  # feedparser FeedParserDict tags
        if isinstance(value, dict):
            value = value.get("term")
        if value:
            value = normalize_whitespace(str(value))
            if value:
                cleaned.append(value)
    # Deduplicate while preserving order.
    seen = set()
    unique = []
    for tag in cleaned:
        if tag.lower() not in seen:
            seen.add(tag.lower())
            unique.append(tag)
    return unique
