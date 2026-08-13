"""
collectors/theverge.py
------------------------
Collector for The Verge's "Artificial Intelligence" section RSS feed.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class TheVergeCollector(RSSCollector):
    """Collects the latest articles from The Verge's AI section."""

    source_name = "The Verge AI"
