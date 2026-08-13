"""
models/article.py
------------------
Defines the canonical `Article` data model used across the whole
VeillIA news-collector pipeline.

Every collector (OpenAI, Anthropic, Google AI, Hugging Face, TechCrunch, ...)
must return a list of `Article` instances. This guarantees that, regardless
of the source or the original data format (RSS, Atom, scraped HTML, future
APIs, etc.), the rest of the pipeline (deduplication, storage, and later the
VeillIA backend) always works with one single, predictable schema.

Design notes
------------
- We use a `dataclass` for a lightweight, explicit, and typed schema.
- All fields that might legitimately be missing default to `None`
  instead of raising an error, since news sources are inconsistent
  in what metadata they expose.
- `to_dict()` / `from_dict()` are provided so the storage layer never
  needs to know anything about the `Article` class internals -- it just
  serializes/deserializes plain dictionaries (JSON-friendly).
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Article:
    """Canonical representation of a single news article.

    Attributes:
        title: Headline of the article. Should always be present.
        url: Canonical/absolute URL of the article. Used as the
            deduplication key across the whole pipeline.
        source: Human-readable name of the source (e.g. "OpenAI").
        author: Author/byline, if the source exposes one.
        published_at: ISO-8601 string of the original publication date,
            normalized to UTC. `None` if unavailable or unparsable.
        summary: Short description/excerpt of the article.
        content: Full or partial article body, if available from the feed.
        image_url: URL of a representative/cover image, if any.
        language: ISO 639-1 language code (e.g. "en"). Defaults to "en"
            since all initial sources are English-language, but is
            explicitly a field so future non-English sources fit in cleanly.
        tags: List of tags/categories associated with the article.
        collected_at: ISO-8601 UTC timestamp of when *this pipeline*
            collected the article (not when it was published).
    """

    title: Optional[str]
    url: Optional[str]
    source: Optional[str]
    author: Optional[str] = None
    published_at: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    language: Optional[str] = "en"
    tags: list[str] = field(default_factory=list)
    collected_at: Optional[str] = None

    def __post_init__(self) -> None:
        # Automatically stamp the collection time in UTC ISO-8601 format
        # unless it was already explicitly provided (e.g. when rebuilding
        # an Article from stored JSON).
        if not self.collected_at:
            self.collected_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        """Serialize the article into a plain, JSON-friendly dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Article":
        """Rebuild an Article instance from a plain dictionary.

        Unknown keys are ignored so the model stays forward-compatible
        with older/newer stored JSON files.
        """
        known_fields = {f for f in cls.__dataclass_fields__}
        filtered = {k: v for k, v in data.items() if k in known_fields}
        return cls(**filtered)

    def is_valid(self) -> bool:
        """Minimal validity check: an article without a title or URL
        is not usable and should be discarded upstream."""
        return bool(self.title) and bool(self.url)
