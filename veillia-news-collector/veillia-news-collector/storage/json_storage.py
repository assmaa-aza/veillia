"""
storage/json_storage.py
-------------------------
Local JSON file storage backend, used for validating the collection
pipeline before it is wired up to the real VeillIA backend (e.g.
Supabase).

This is intentionally the ONLY module in the whole project that knows
about the on-disk JSON file. Collectors and `main.py` interact with
storage exclusively through the `BaseStorage` interface, so swapping
this for `SupabaseStorage` later requires no changes anywhere else.
"""

from __future__ import annotations

import json
from pathlib import Path

from models.article import Article
from storage.base import BaseStorage
from utils.logger import get_logger

logger = get_logger(__name__)


class JSONStorage(BaseStorage):
    """Persists articles as a JSON array in a local file."""

    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)

    def load(self) -> list[Article]:
        """Load previously stored articles, if any.

        Returns an empty list if the file doesn't exist yet or contains
        invalid JSON -- this is treated as "no prior data" rather than
        a fatal error, since this storage layer is explicitly for
        testing/validation.
        """
        if not self.file_path.exists():
            return []

        try:
            with self.file_path.open("r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning(
                "Could not read existing data at %s (%s) -- starting fresh.",
                self.file_path,
                exc,
            )
            return []

        return [Article.from_dict(item) for item in raw_data]

    def save(self, articles: list[Article]) -> None:
        """Write the given articles to disk as a pretty-printed JSON array.

        Creates the parent directory if it doesn't exist yet.
        """
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

        payload = [article.to_dict() for article in articles]

        try:
            with self.file_path.open("w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
        except OSError as exc:
            # Storage failure is treated as fatal for this pipeline stage,
            # since persisting the results is the whole point of the run,
            # but we still log clearly instead of an opaque traceback.
            logger.error("Failed to write articles to %s: %s", self.file_path, exc)
            raise

        logger.info("Saved %d article(s) to %s", len(articles), self.file_path)
