"""
utils/parser.py
----------------
Shared parsing helpers used by collectors to normalize heterogeneous
RSS/Atom field formats into the canonical `Article` schema.

Centralizing this logic avoids duplicating fragile date/field parsing
code in every single collector.
"""

from __future__ import annotations

import time
from calendar import timegm
from datetime import datetime, timezone

from dateutil import parser as date_parser

from utils.logger import get_logger

logger = get_logger(__name__)


def parse_date(raw_date, parsed_struct=None) -> str | None:
    """Normalize a date coming from an RSS entry into an ISO-8601 UTC string.

    RSS feeds are notoriously inconsistent with date formats. `feedparser`
    already tries to parse dates into a `time.struct_time` (available as
    `entry.published_parsed` / `entry.updated_parsed`), which is the most
    reliable source when present. As a fallback, we attempt to parse the
    raw string with `dateutil`, which handles most RFC 822 / ISO 8601
    variants found in the wild.

    Args:
        raw_date: The raw date string from the feed (e.g. entry.published).
        parsed_struct: Optional pre-parsed `time.struct_time` from feedparser
            (e.g. entry.published_parsed), which is timezone-normalized (UTC)
            by feedparser itself.

    Returns:
        ISO-8601 formatted UTC string, or None if parsing failed.
    """
    # Prefer feedparser's already-normalized struct_time (assumed UTC).
    if parsed_struct is not None:
        try:
            timestamp = timegm(parsed_struct)
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
        except (TypeError, ValueError, OverflowError) as exc:
            logger.debug("Failed to convert parsed_struct %r: %s", parsed_struct, exc)

    if raw_date:
        try:
            dt = date_parser.parse(raw_date)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except (ValueError, OverflowError, TypeError) as exc:
            logger.debug("Failed to parse raw date %r: %s", raw_date, exc)

    return None


def first_present(*values):
    """Return the first non-empty value among the given arguments.

    Convenience helper for picking the best available field out of
    several possible feed attribute names (e.g. `media_content` vs
    `enclosures` vs a regex match inside the summary HTML).
    """
    for value in values:
        if value:
            return value
    return None


def extract_image_from_entry(entry) -> str | None:
    """Best-effort extraction of a representative image URL from a
    feedparser entry, trying the most common RSS/Media-RSS conventions.
    """
    # 1. Media RSS <media:content> / <media:thumbnail>
    media_content = getattr(entry, "media_content", None)
    if media_content:
        for media in media_content:
            url = media.get("url")
            if url:
                return url

    media_thumbnail = getattr(entry, "media_thumbnail", None)
    if media_thumbnail:
        for media in media_thumbnail:
            url = media.get("url")
            if url:
                return url

    # 2. <enclosure> tags with an image mime type.
    for enclosure in getattr(entry, "enclosures", []) or []:
        enclosure_type = enclosure.get("type", "")
        if enclosure_type.startswith("image/"):
            url = enclosure.get("href") or enclosure.get("url")
            if url:
                return url

    # 3. Fallback: look for an <img> tag inside the HTML summary/content.
    from bs4 import BeautifulSoup

    html_blob = getattr(entry, "summary", "") or ""
    if not html_blob and getattr(entry, "content", None):
        html_blob = entry.content[0].get("value", "")

    if html_blob:
        soup = BeautifulSoup(html_blob, "html.parser")
        img_tag = soup.find("img")
        if img_tag and img_tag.get("src"):
            return img_tag["src"]

    return None
