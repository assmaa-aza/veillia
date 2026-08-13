"""
collectors/google_ai.py
------------------------
Collector for the Google AI blog RSS feed (published under blog.google).
"""

from __future__ import annotations

from collectors.base import RSSCollector


class GoogleAICollector(RSSCollector):
    """Collects the latest articles from the Google AI blog."""

    source_name = "Google AI"
