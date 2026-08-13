"""Supabase implementation of the ArticleRepository interface."""
from __future__ import annotations

import logging

from supabase import Client, create_client

from config import SupabaseConfig
from database.base import (
    ArticleAnalysisRepository,
    ArticleClassificationRepository,
    ArticleContentRepository,
    ArticleLookupRepository,
    ArticleRepository,
)
from exceptions import DatabaseError
from models.article import Article

logger = logging.getLogger(__name__)


class SupabaseArticleRepository(
    ArticleRepository,
    ArticleClassificationRepository,
    ArticleAnalysisRepository,
    ArticleContentRepository,
    ArticleLookupRepository,
):
    """Reads/writes the `articles` table in Supabase (Postgres) via supabase-py."""

    def __init__(self, config: SupabaseConfig) -> None:
        self._config = config
        try:
            self._client: Client = create_client(config.url, config.key)
        except Exception as exc:  # noqa: BLE001 - wrap any client init failure
            raise DatabaseError(f"Failed to initialize Supabase client: {exc}") from exc

    def get_unsummarized_articles(self, limit: int) -> list[Article]:
        """Fetch articles where `summary` is NULL or an empty string.

        Ordered oldest-collected-first so the service processes the backlog
        in a predictable, fair order across runs.
        """
        try:
            response = (
                self._client.table(self._config.table_name)
                .select("*")
                .or_("summary.is.null,summary.eq.")
                .order("collected_at", desc=False)
                .limit(limit)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(f"Failed to fetch unsummarized articles: {exc}") from exc

        rows = response.data or []
        return [Article.from_row(row) for row in rows]

    def update_summary(self, article_id: int, summary: str) -> None:
        """Update the `summary` column of an existing row (never inserts)."""
        try:
            result = (
                self._client.table(self._config.table_name)
                .update({"summary": summary})
                .eq("id", article_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(
                f"Failed to update summary for article {article_id}: {exc}"
            ) from exc

        if not result.data:
            logger.warning(
                "Update for article %s affected no rows (id may not exist).", article_id
            )

    def get_unclassified_articles(self, limit: int) -> list[Article]:
        """Fetch articles where `category` is NULL or an empty string."""
        try:
            response = (
                self._client.table(self._config.table_name)
                .select("*")
                .or_("category.is.null,category.eq.")
                .order("collected_at", desc=False)
                .limit(limit)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(f"Failed to fetch unclassified articles: {exc}") from exc

        rows = response.data or []
        return [Article.from_row(row) for row in rows]

    def update_category(self, article_id: int, category: str) -> None:
        """Update the `category` column of an existing row (never inserts)."""
        try:
            result = (
                self._client.table(self._config.table_name)
                .update({"category": category})
                .eq("id", article_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(
                f"Failed to update category for article {article_id}: {exc}"
            ) from exc

        if not result.data:
            logger.warning(
                "Category update for article %s affected no rows (id may not exist).",
                article_id,
            )

    def get_articles_missing_analysis(self, limit: int) -> list[Article]:
        """Fetch articles where `analysis` is NULL.

        `analysis` is jsonb (not text), so unlike `summary`/`category` there
        is no meaningful "empty string" case to also check for -- NULL is
        the only "not yet analyzed" state.
        """
        try:
            response = (
                self._client.table(self._config.table_name)
                .select("*")
                .is_("analysis", "null")
                .order("collected_at", desc=False)
                .limit(limit)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(f"Failed to fetch articles missing analysis: {exc}") from exc

        rows = response.data or []
        return [Article.from_row(row) for row in rows]

    def update_analysis(self, article_id: int, analysis: dict) -> None:
        """Update the `analysis` column of an existing row (never inserts)."""
        try:
            result = (
                self._client.table(self._config.table_name)
                .update({"analysis": analysis})
                .eq("id", article_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(
                f"Failed to update analysis for article {article_id}: {exc}"
            ) from exc

        if not result.data:
            logger.warning(
                "Analysis update for article %s affected no rows (id may not exist).",
                article_id,
            )

    def update_content(self, article_id: int, content: str) -> None:
        """Update the `content` column of an existing row (never inserts)."""
        try:
            result = (
                self._client.table(self._config.table_name)
                .update({"content": content})
                .eq("id", article_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(
                f"Failed to update content for article {article_id}: {exc}"
            ) from exc

        if not result.data:
            logger.warning(
                "Content update for article %s affected no rows (id may not exist).",
                article_id,
            )

    def get_article_by_id(self, article_id: int) -> Article | None:
        """Fetch a single article by id, or None if it doesn't exist.

        Used by the chat API to load the article + its already-generated
        `summary`/`analysis` as context for a conversation -- a single-row
        lookup by primary key, so this stays fast even under chat-latency
        expectations.
        """
        try:
            response = (
                self._client.table(self._config.table_name)
                .select("*")
                .eq("id", article_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise DatabaseError(f"Failed to fetch article {article_id}: {exc}") from exc

        rows = response.data or []
        if not rows:
            return None
        return Article.from_row(rows[0])
