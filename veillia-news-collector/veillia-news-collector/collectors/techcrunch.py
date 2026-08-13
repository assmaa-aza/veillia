"""
collectors/techcrunch.py
--------------------------
Collector for TechCrunch's "Artificial Intelligence" category RSS feed.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class TechCrunchAICollector(RSSCollector):
    """Collects the latest articles from TechCrunch's AI category."""

    source_name = "TechCrunch AI"
