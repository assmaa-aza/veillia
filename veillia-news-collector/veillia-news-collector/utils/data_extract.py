"""
utils/date_extract.py
-----------------------
Best-effort extraction of a date (optionally with a time) from a raw
text blob, in English or French.

Why this exists
-----------------
`utils/parser.py::parse_date` normalizes a date that's *already been
isolated* by feedparser (an RSS entry's `published`/`updated` field, or
`AnthropicCollector`'s own hand-rolled English-date-prefix regex). The
new HTML-scraped sources (mmsp.gov.ma, Technopark, Civica) render dates
inline inside a larger text blob, in French, e.g.:

    "9 juillet 2026, 17:00"
    "Vendredi 6 février 2026"

`dateutil.parser` (used by `parse_date`) does not recognize French
month names, so a small dedicated helper is needed. This mirrors
`AnthropicCollector._split_anchor_text`'s approach (peel a recognizable
date pattern off a text blob) but for French, and returns a full
ISO-8601 UTC string via the existing `utils.parser.parse_date` once the
date has been normalized to English.
"""

from __future__ import annotations

import re

from utils.logger import get_logger
from utils.parser import parse_date

logger = get_logger(__name__)

_FR_MONTHS = {
    "janvier": "January",
    "fevrier": "February",
    "février": "February",
    "mars": "March",
    "avril": "April",
    "mai": "May",
    "juin": "June",
    "juillet": "July",
    "aout": "August",
    "août": "August",
    "septembre": "September",
    "octobre": "October",
    "novembre": "November",
    "decembre": "December",
    "décembre": "December",
}

# e.g. "9 juillet 2026, 17:00" / "9 juillet 2026" / "09 Juillet 2026 17h30"
_FR_DATE_RE = re.compile(
    r"(\d{1,2})\s+(" + "|".join(_FR_MONTHS.keys()) + r")\s+(\d{4})"
    r"(?:[,\s]+(\d{1,2})[h:](\d{2}))?",
    re.IGNORECASE,
)

# e.g. "Jul 9, 2026" / "July 9, 2026" / "9 July 2026"
_EN_DATE_RE = re.compile(
    r"([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(\d{4})"
    r"|(\d{1,2})\s+([A-Z][a-z]{2,8})\s+(\d{4})"
)


def extract_date(text: str | None) -> str | None:
    """Find the first French or English date in `text` and normalize it
    to an ISO-8601 UTC string. Returns None if no date could be found
    or parsed -- callers should treat this the same as any other
    missing field, not a fatal error.
    """
    if not text:
        return None

    fr_match = _FR_DATE_RE.search(text)
    if fr_match:
        day, month_fr, year, hour, minute = fr_match.groups()
        month_en = _FR_MONTHS.get(month_fr.lower())
        if month_en:
            raw = f"{day} {month_en} {year}"
            if hour and minute:
                raw += f" {hour}:{minute}"
            try:
                return parse_date(raw_date=raw)
            except Exception as exc:  # noqa: BLE001 - never let a bad date crash the run
                logger.debug("date_extract: failed to parse French date %r: %s", raw, exc)

    en_match = _EN_DATE_RE.search(text)
    if en_match:
        raw = en_match.group(0)
        try:
            return parse_date(raw_date=raw)
        except Exception as exc:  # noqa: BLE001
            logger.debug("date_extract: failed to parse English date %r: %s", raw, exc)

    return None