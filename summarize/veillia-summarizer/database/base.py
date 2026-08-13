"""Abstract repository interface for article persistence.

`services/pipeline.py` depends only on this interface, not on Supabase
directly. Swapping to another Postgres client, a different database
entirely, or an in-memory fake for tests only requires a new class that
implements `ArticleRepository`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from models.article import Article


class ArticleRepository(ABC):
    """Contract for fetching/updating articles regardless of backing store."""

    @abstractmethod
    def get_unsummarized_articles(self, limit: int) -> list[Article]:
        """Return up to `limit` articles that do not yet have a summary."""
        raise NotImplementedError

    @abstractmethod
    def update_summary(self, article_id: int, summary: str) -> None:
        """Persist a generated summary for the article with the given id.

        Must update the existing row in place -- never create a new record.
        """
        raise NotImplementedError


class ArticleClassificationRepository(ABC):
    """Contract for fetching/updating article topic categories.

    Kept as a separate interface from `ArticleRepository` (Interface
    Segregation Principle): a caller that only does classification
    shouldn't need to depend on summarization methods, and vice versa. A
    single concrete class (e.g. `SupabaseArticleRepository`) can implement
    both when it's backed by the same table.
    """

    @abstractmethod
    def get_unclassified_articles(self, limit: int) -> list[Article]:
        """Return up to `limit` articles that do not yet have a category."""
        raise NotImplementedError

    @abstractmethod
    def update_category(self, article_id: int, category: str) -> None:
        """Persist a category for the article with the given id.

        Must update the existing row in place -- never create a new record.
        """
        raise NotImplementedError


class ArticleAnalysisRepository(ABC):
    """Contract for fetching/updating structured article analyses.

    Kept separate from the other repository interfaces (Interface
    Segregation) for the same reason as `ArticleClassificationRepository`:
    a caller doing only analysis shouldn't need to depend on summarization
    or classification methods.
    """

    @abstractmethod
    def get_articles_missing_analysis(self, limit: int) -> list[Article]:
        """Return up to `limit` articles that do not yet have an analysis."""
        raise NotImplementedError

    @abstractmethod
    def update_analysis(self, article_id: int, analysis: dict) -> None:
        """Persist a structured analysis (as a dict/jsonb) for the given article.

        Must update the existing row in place -- never create a new record.
        """
        raise NotImplementedError


class ArticleContentRepository(ABC):
    """Contract for overwriting an article's stored `content`.

    Separate, narrow interface (Interface Segregation) so it can be reused
    by any pipeline that fetches richer content -- today that's the
    analysis pipeline filling in full page text when the stored content is
    just a short RSS teaser, but the same interface works for other future
    callers too.
    """

    @abstractmethod
    def update_content(self, article_id: int, content: str) -> None:
        """Persist fetched content for the given article.

        Must update the existing row in place -- never create a new record.
        Callers are expected to only call this to *improve* content (e.g.
        replacing a short teaser with the full article body), never to
        overwrite good content with something worse.
        """
        raise NotImplementedError


class ArticleLookupRepository(ABC):
    """Contract for fetching a single, specific article by id.

    Separate from `ArticleRepository` (which only fetches *batches* of
    articles needing work) because the chat API needs a different access
    pattern: one article, on demand, by id, including its already-generated
    `summary` and `analysis` -- not "articles missing X".
    """

    @abstractmethod
    def get_article_by_id(self, article_id: int) -> Article | None:
        """Return the article with the given id, or None if it doesn't exist."""
        raise NotImplementedError
