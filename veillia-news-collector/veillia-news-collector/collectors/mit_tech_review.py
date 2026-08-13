"""
collectors/mit_tech_review.py
--------------------------------
Collector for MIT Technology Review's "Artificial Intelligence" topic
RSS feed.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class MITTechReviewCollector(RSSCollector):
    """Collects the latest articles from MIT Technology Review's AI topic."""

    source_name = "MIT Technology Review AI"
