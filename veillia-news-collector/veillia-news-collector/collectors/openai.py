"""
collectors/openai.py
---------------------
Collector for the official OpenAI News RSS feed.

OpenAI publishes a standard RSS feed, so this collector is a thin
subclass of `RSSCollector` -- no source-specific quirks needed today.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class OpenAICollector(RSSCollector):
    """Collects the latest articles from the OpenAI News blog."""

    source_name = "OpenAI"
