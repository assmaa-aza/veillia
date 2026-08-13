"""
storage/base.py
----------------
Abstract storage interface. `JSONStorage` is the only implementation
today, but defining this interface now means a future `SupabaseStorage`
(or any other backend) is a drop-in replacement: `main.py` and the
collectors never need to know *how* articles are persisted, only that
`save(articles)` exists.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from models.article import Article


class BaseStorage(ABC):
    """Abstract interface every storage backend must implement."""

    @abstractmethod
    def load(self) -> list[Article]:
        """Load and return previously stored articles (possibly empty)."""
        raise NotImplementedError

    @abstractmethod
    def save(self, articles: list[Article]) -> None:
        """Persist the given list of articles, replacing prior contents."""
        raise NotImplementedError
