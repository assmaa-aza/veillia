"""
collectors/arstechnica.py
----------------------------
Collector for Ars Technica's "Artificial Intelligence" section RSS feed.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class ArsTechnicaCollector(RSSCollector):
    """Collects the latest articles from Ars Technica's AI section."""

    source_name = "Ars Technica AI"
