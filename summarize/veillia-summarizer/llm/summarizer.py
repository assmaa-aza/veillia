"""High-level summarization services.

Two strategies are provided, both implementing the same `Summarizer`
interface so `services/pipeline.py` can use either one interchangeably:

- `LLMSummarizer`: sends the whole article in a single prompt.
- `ChunkedLLMSummarizer`: splits the article into smaller parts, summarizes
  each part separately, then merges those partial summaries into one final
  summary. This keeps each individual LLM call small (faster, lighter on
  RAM) and avoids truncating/losing the end of long articles, which a
  single big prompt would either risk timing out on or have to cut short.

Neither of these talks to Ollama or Supabase directly -- only through the
`LLMClient` interface -- so both work with any backend.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from exceptions import LLMError, SummarizationError
from llm.base import LLMClient
from llm.prompts import PromptBuilder
from llm.text_chunker import TextChunker
from models.article import Article

logger = logging.getLogger(__name__)


def _clean_llm_text(text: str) -> str:
    """Strip common LLM artifacts (wrapping quotes, boilerplate preambles).

    Shared by both summarizer strategies so cleanup behavior stays
    consistent regardless of which one produced the raw text.
    """
    cleaned = text.strip().strip('"').strip()

    prefixes_to_strip = (
        "Summary:", "Here is a summary:", "Here's a summary:",
        "Final summary:", "Summary of this part:",
    )
    for prefix in prefixes_to_strip:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()

    return cleaned


class Summarizer(ABC):
    """Interface for anything capable of turning an Article into a summary.

    Defined so alternative summarization strategies (single-pass, chunked,
    or something else entirely later) can be swapped in without changing
    the pipeline that uses them.
    """

    @abstractmethod
    def summarize(self, article: Article) -> str:
        raise NotImplementedError


class LLMSummarizer(Summarizer):
    """Single-pass summarizer: the whole article goes into one prompt.

    Simple and fast for short/medium articles. For long articles on a
    memory-constrained machine, prefer `ChunkedLLMSummarizer` instead.
    """

    def __init__(self, llm_client: LLMClient, prompt_builder: PromptBuilder) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder

    def summarize(self, article: Article) -> str:
        prompt = self._prompt_builder.build_summary_prompt(article)
        try:
            raw_summary = self._llm_client.generate(
                prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise SummarizationError(f"Failed to summarize article {article.id}: {exc}") from exc

        return _clean_llm_text(raw_summary)


class ChunkedLLMSummarizer(Summarizer):
    """Map-reduce style summarizer: split -> summarize each part -> merge.

    1. The article's content is split into `num_chunks` roughly-equal parts
       (on whitespace boundaries, via `TextChunker`).
    2. Each part is summarized independently, in a short, self-contained
       prompt (this is the "map" step).
    3. The resulting partial summaries are merged into one final, coherent
       summary in the target word range (the "reduce" step).

    Falls back to a single-pass `LLMSummarizer` for short articles, where
    splitting into several tiny fragments would only add overhead without
    any benefit.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        prompt_builder: PromptBuilder,
        chunker: TextChunker | None = None,
        num_chunks: int = 3,
        direct_fallback_chars: int = 600,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder
        self._chunker = chunker or TextChunker()
        self._num_chunks = num_chunks
        self._direct_fallback_chars = direct_fallback_chars
        # Reused for the short-article fallback rather than duplicating
        # single-pass logic here.
        self._direct_summarizer = LLMSummarizer(llm_client, prompt_builder)

    def summarize(self, article: Article) -> str:
        content = article.content.strip()

        if len(content) <= self._direct_fallback_chars:
            logger.info(
                "Article %d is short (%d chars) -- summarizing in a single pass instead of chunking.",
                article.id, len(content),
            )
            return self._direct_summarizer.summarize(article)

        chunks = self._chunker.split(content, self._num_chunks)
        if len(chunks) <= 1:
            # Chunking didn't actually produce multiple usable parts
            # (e.g. one giant word with no whitespace) -- fall back safely.
            return self._direct_summarizer.summarize(article)

        title = article.title.strip()
        total = len(chunks)
        partial_summaries: list[str] = []

        for index, chunk in enumerate(chunks, start=1):
            prompt = self._prompt_builder.build_partial_summary_prompt(title, chunk, index, total)
            try:
                raw_part = self._llm_client.generate(
                    prompt, system_prompt=self._prompt_builder.system_prompt
                )
            except LLMError as exc:
                raise SummarizationError(
                    f"Failed to summarize part {index}/{total} of article {article.id}: {exc}"
                ) from exc

            partial = _clean_llm_text(raw_part)
            partial_summaries.append(partial)
            logger.info(
                "Article %d: part %d/%d summarized (%d words).",
                article.id, index, total, len(partial.split()),
            )

        merge_prompt = self._prompt_builder.build_merge_prompt(title, partial_summaries)
        try:
            raw_final = self._llm_client.generate(
                merge_prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise SummarizationError(
                f"Failed to merge partial summaries for article {article.id}: {exc}"
            ) from exc

        return _clean_llm_text(raw_final)
