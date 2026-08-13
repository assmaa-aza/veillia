"""
collectors/arxiv.py
----------------------
Collector for the arXiv cs.AI (Artificial Intelligence) category RSS
feed -- primary research papers, not editorial coverage.

Two things make this source different from the others:

1. **Very high volume.** arXiv cs.AI can publish dozens of new papers a
   day. `config.py` sets a lower `max_articles` override for this
   source specifically, so it doesn't crowd out every other source in
   a single pipeline run.
2. **Title suffix quirk.** arXiv's RSS titles typically end with the
   paper's arXiv identifier, e.g. "Some Paper Title. (arXiv:2401.01234v1
   [cs.AI])". That's useful metadata but noisy as a headline, so this
   collector strips it after the shared `RSSCollector` parsing runs.
"""

from __future__ import annotations

import re

from collectors.base import RSSCollector

# Matches a trailing "(arXiv:2401.01234v1 [cs.AI])"-style suffix.
_ARXIV_ID_SUFFIX_RE = re.compile(r"\s*\(arXiv:[^)]+\)\s*$")


class ArxivCollector(RSSCollector):
    """Collects the latest papers from the arXiv cs.AI category feed."""

    source_name = "arXiv cs.AI"

    def collect(self):
        articles = super().collect()
        for article in articles:
            if article.title:
                article.title = _ARXIV_ID_SUFFIX_RE.sub("", article.title).strip()
        return articles
