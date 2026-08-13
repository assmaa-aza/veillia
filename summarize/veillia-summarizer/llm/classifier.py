"""Topic classification service.

Mirrors `llm/summarizer.py`'s shape: combines a prompt builder with an
`LLMClient` to turn an `Article` into a `Category`. Reuses the exact same
`LLMClient` interface (and therefore the same Ollama backend) as the
summarizer -- classification is just a different task on top of the same
local model infrastructure.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from exceptions import ClassificationError, LLMError
from llm.base import LLMClient
from llm.prompts import ClassificationPromptBuilder
from llm.text_chunker import TextChunker
from models.article import Article
from models.category import Category

logger = logging.getLogger(__name__)


class TopicClassifier(ABC):
    """Interface for anything capable of assigning a Category to an Article."""

    @abstractmethod
    def classify(self, article: Article) -> Category:
        raise NotImplementedError


class LLMTopicClassifier(TopicClassifier):
    """Classifier implementation backed by any LLMClient (e.g. Ollama)."""

    def __init__(self, llm_client: LLMClient, prompt_builder: ClassificationPromptBuilder) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder

    def classify(self, article: Article) -> Category:
        prompt = self._prompt_builder.build_classification_prompt(article)
        try:
            raw_output = self._llm_client.generate(
                prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise ClassificationError(f"Failed to classify article {article.id}: {exc}") from exc

        category = Category.from_text(raw_output)
        if category is None:
            raise ClassificationError(
                f"Article {article.id}: model returned an unrecognized category: {raw_output!r}"
            )
        return category


class ChunkedLLMTopicClassifier(TopicClassifier):
    """Map-reduce style classifier: split -> classify each part -> majority vote.

    1. The article's content is split into `num_chunks` roughly-equal parts
       (via `TextChunker`), same as `ChunkedLLMSummarizer`.
    2. Each part is classified independently, in its own short prompt --
       every individual call stays small and fast regardless of how long
       the full article is.
    3. The final category is whichever category a plurality of chunks
       agreed on (ties broken by the order chunks were processed, i.e. the
       earliest chunk's category wins).

    Falls back to a single-pass `LLMTopicClassifier` for short articles,
    where splitting into several tiny fragments would only add overhead
    (and extra round-trips) without any benefit.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        prompt_builder: ClassificationPromptBuilder,
        chunker: TextChunker | None = None,
        num_chunks: int = 3,
        direct_fallback_chars: int = 600,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder
        self._chunker = chunker or TextChunker()
        self._num_chunks = num_chunks
        self._direct_fallback_chars = direct_fallback_chars
        self._direct_classifier = LLMTopicClassifier(llm_client, prompt_builder)

    def classify(self, article: Article) -> Category:
        content = article.content.strip()

        if len(content) <= self._direct_fallback_chars:
            logger.info(
                "Article %d is short (%d chars) -- classifying in a single pass instead of chunking.",
                article.id, len(content),
            )
            return self._direct_classifier.classify(article)

        chunks = self._chunker.split(content, self._num_chunks)
        if len(chunks) <= 1:
            return self._direct_classifier.classify(article)

        title = article.title.strip()
        total = len(chunks)
        votes: list[Category] = []

        for index, chunk in enumerate(chunks, start=1):
            prompt = self._prompt_builder.build_chunk_classification_prompt(title, chunk, index, total)
            try:
                raw_output = self._llm_client.generate(
                    prompt, system_prompt=self._prompt_builder.system_prompt
                )
            except LLMError as exc:
                logger.warning(
                    "Article %d: chunk %d/%d classification failed, skipping this vote: %s",
                    article.id, index, total, exc,
                )
                continue

            category = Category.from_text(raw_output)
            if category is None:
                logger.warning(
                    "Article %d: chunk %d/%d returned an unrecognized category %r, skipping this vote.",
                    article.id, index, total, raw_output,
                )
                continue

            votes.append(category)
            logger.info("Article %d: chunk %d/%d voted '%s'.", article.id, index, total, category.value)

        if not votes:
            raise ClassificationError(
                f"Article {article.id}: no chunk produced a recognizable category."
            )

        return self._majority_vote(votes)

    @staticmethod
    def _majority_vote(votes: list[Category]) -> Category:
        """Return the most common category, breaking ties by first occurrence."""
        counts: dict[Category, int] = {}
        for vote in votes:
            counts[vote] = counts.get(vote, 0) + 1

        best_count = max(counts.values())
        for vote in votes:  # iterate in original order so ties favor the earliest chunk
            if counts[vote] == best_count:
                return vote
        return votes[0]  # unreachable, but keeps type checkers happy
