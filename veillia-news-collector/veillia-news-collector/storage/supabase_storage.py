"""
storage/supabase_storage.py
-----------------------------
Supabase-backed storage implementation.

This replaces `JSONStorage` as the pipeline's storage backend. It
implements the exact same `BaseStorage` interface (`load()` / `save()`),
which is *why* this swap required zero changes to any collector and only
a one-line change in `main.py`.

Pipeline shape:

    Collector -> Normalize (Article) -> Supabase

Deduplication strategy
-----------------------
`main.py` already deduplicates in-memory by URL before calling `save()`.
On top of that, this backend performs an **upsert** keyed on the `url`
column (`on_conflict="url"`), so re-running the pipeline multiple times
(e.g. daily) never creates duplicate rows in the database -- articles
that already exist are updated in place instead. This requires a UNIQUE
constraint on the `url` column in the `articles` table (see
`storage/schema.sql`).

Setup
-----
1. Create the table in your Supabase project by running the SQL in
   `storage/schema.sql` (Supabase Dashboard -> SQL Editor -> paste ->
   Run).
2. Set `SUPABASE_URL` and `SUPABASE_KEY` in your `.env` file (see
   `.env.example`). The key can be the `anon` key if you've configured
   Row Level Security policies to allow inserts/upserts, or the
   `service_role` key for a trusted server-side pipeline like this one.
3. Run `python main.py` as usual -- articles now go to Supabase instead
   of a local JSON file.
"""

from __future__ import annotations

from supabase import Client, create_client

from models.article import Article
from storage.base import BaseStorage
from utils.logger import get_logger

logger = get_logger(__name__)

# Supabase/Postgres row-write limits mean very large batches should be
# chunked rather than sent in a single request.
_UPSERT_BATCH_SIZE = 200


class SupabaseStorage(BaseStorage):
    """Persists articles to a Supabase (Postgres) table."""

    def __init__(self, url: str, key: str, table: str = "articles"):
        if not url or not key:
            raise ValueError(
                "SupabaseStorage requires both a Supabase URL and API key. "
                "Set SUPABASE_URL and SUPABASE_KEY in your .env file."
            )
        self.table_name = table
        self._client: Client = create_client(url, key)

    def load(self) -> list[Article]:
        """Load all articles currently stored in the Supabase table.

        Returns an empty list (with a logged warning) if the table
        doesn't exist yet or the query fails, rather than raising --
        consistent with `JSONStorage.load()`'s "no prior data" behaviour.
        """
        try:
            response = self._client.table(self.table_name).select("*").execute()
        except Exception as exc:  # noqa: BLE001 - surface any client/network error
            logger.warning(
                "Could not load existing articles from Supabase table '%s' (%s) -- "
                "treating as empty.",
                self.table_name,
                exc,
            )
            return []

        rows = response.data or []
        return [Article.from_dict(row) for row in rows]

    def save(self, articles: list[Article]) -> None:
        """Upsert the given articles into the Supabase table, keyed on `url`.

        Articles are sent in batches to stay well within Supabase/Postgrest
        request size limits. Raises on failure, since (as with
        `JSONStorage`) persisting results is the whole point of a run --
        callers should see a clear failure rather than a silent no-op.
        """
        if not articles:
            logger.info("No articles to save -- skipping Supabase upsert.")
            return

        payload = [self._to_row(article) for article in articles]

        try:
            for batch in self._chunk(payload, _UPSERT_BATCH_SIZE):
                self._client.table(self.table_name).upsert(
                    batch, on_conflict="url"
                ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to upsert articles into Supabase table '%s': %s",
                self.table_name,
                exc,
            )
            raise

        logger.info(
            "Upserted %d article(s) into Supabase table '%s'",
            len(payload),
            self.table_name,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_row(article: Article) -> dict:
        """Convert an Article into a JSON-serializable row for Postgrest.

        The `tags` field maps directly to a `jsonb`/`text[]` column
        (see schema.sql) -- Postgrest handles Python lists natively.
        """
        return article.to_dict()

    @staticmethod
    def _chunk(items: list, size: int):
        for i in range(0, len(items), size):
            yield items[i : i + size]
