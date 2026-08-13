"""
collectors/huggingface.py
--------------------------
Collector for the Hugging Face Blog RSS feed.
"""

from __future__ import annotations

from collectors.base import RSSCollector


class HuggingFaceCollector(RSSCollector):
    """Collects the latest articles from the Hugging Face blog."""

    source_name = "Hugging Face"
