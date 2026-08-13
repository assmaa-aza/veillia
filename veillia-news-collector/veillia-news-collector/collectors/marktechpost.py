"""
collectors/marktechpost.py
-----------------------------
Collector for the MarkTechPost RSS feed (AI paper roundups and
fast-turnaround launch coverage).
"""

from __future__ import annotations

from collectors.base import RSSCollector


class MarkTechPostCollector(RSSCollector):
    """Collects the latest articles from MarkTechPost."""

    source_name = "MarkTechPost"
