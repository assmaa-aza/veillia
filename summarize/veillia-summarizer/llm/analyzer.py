"""Structured article analysis service.

Same shape as `llm/summarizer.py` and `llm/classifier.py`: combines a
prompt builder with an `LLMClient`, then hands the raw text to
`AnalysisParser` to get a structured `ArticleAnalysis` back. Reuses the
same `LLMClient` interface (and therefore the same Ollama backend) as
every other pipeline in the project.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from exceptions import AnalysisError, LLMError
from llm.analysis_parser import AnalysisParseError, AnalysisParser
from llm.base import LLMClient
from llm.prompts import AnalysisPromptBuilder
from llm.text_chunker import TextChunker
from models.analysis import ArticleAnalysis
from models.article import Article

logger = logging.getLogger(__name__)


class ArticleAnalyzer(ABC):
    """Interface for anything capable of producing a structured ArticleAnalysis."""

    @abstractmethod
    def analyze(self, article: Article) -> ArticleAnalysis:
        raise NotImplementedError


class LLMArticleAnalyzer(ArticleAnalyzer):
    """Analyzer implementation backed by any LLMClient (e.g. Ollama)."""

    def __init__(
        self,
        llm_client: LLMClient,
        prompt_builder: AnalysisPromptBuilder,
        parser: AnalysisParser | None = None,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder
        self._parser = parser or AnalysisParser()

    def analyze(self, article: Article) -> ArticleAnalysis:
        prompt = self._prompt_builder.build_analysis_prompt(article)
        try:
            raw_output = self._llm_client.generate(
                prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise AnalysisError(f"Failed to analyze article {article.id}: {exc}") from exc

        try:
            return self._parser.parse(raw_output)
        except AnalysisParseError as exc:
            raise AnalysisError(
                f"Article {article.id}: could not parse a valid analysis from the model output: {exc}"
            ) from exc


class ChunkedLLMArticleAnalyzer(ArticleAnalyzer):
    """Map-reduce style analyzer: split -> extract notes -> 2 lighter generations.

    Instead of one large call asking the model to produce all 7 sections
    from the full raw article (the heaviest single request in the whole
    project -- long input AND long output), this strategy does:

    1. **Map**: split the article into `num_chunks` parts (via
       `TextChunker`) and extract short factual notes from each part
       independently (`build_chunk_notes_prompt`) -- cheap, short-output
       calls.
    2. **Reduce, in two lighter calls instead of one heavy one**: the
       digested notes are fed into two separate, smaller generation calls
       -- one producing the 4 narrative sections
       (`build_narrative_sections_prompt`), one producing the 3 list
       sections (`build_list_sections_prompt`). Each call has fewer output
       tokens to generate than the original combined 7-section prompt, and
       neither needs the full raw article as input.

    Falls back to a single-pass `LLMArticleAnalyzer` for short articles,
    where this extra machinery would only add round-trips for no benefit.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        prompt_builder: AnalysisPromptBuilder,
        parser: AnalysisParser | None = None,
        chunker: TextChunker | None = None,
        num_chunks: int = 3,
        direct_fallback_chars: int = 800,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder
        self._parser = parser or AnalysisParser()
        self._chunker = chunker or TextChunker()
        self._num_chunks = num_chunks
        self._direct_fallback_chars = direct_fallback_chars
        self._direct_analyzer = LLMArticleAnalyzer(llm_client, prompt_builder, self._parser)

    def analyze(self, article: Article) -> ArticleAnalysis:
        content = article.content.strip()

        if len(content) <= self._direct_fallback_chars:
            logger.info(
                "Article %d is short (%d chars) -- analyzing in a single pass instead of chunking.",
                article.id, len(content),
            )
            return self._direct_analyzer.analyze(article)

        chunks = self._chunker.split(content, self._num_chunks)
        if len(chunks) <= 1:
            return self._direct_analyzer.analyze(article)

        title = article.title.strip()
        total = len(chunks)
        notes: list[str] = []

        for index, chunk in enumerate(chunks, start=1):
            prompt = self._prompt_builder.build_chunk_notes_prompt(title, chunk, index, total)
            try:
                raw_note = self._llm_client.generate(
                    prompt, system_prompt=self._prompt_builder.system_prompt
                )
            except LLMError as exc:
                raise AnalysisError(
                    f"Failed to extract notes from part {index}/{total} of article {article.id}: {exc}"
                ) from exc
            notes.append(raw_note.strip())
            logger.info("Article %d: notes extracted from part %d/%d.", article.id, index, total)

        digested_notes = "\n".join(f"- {note}" for note in notes)

        narrative_prompt = self._prompt_builder.build_narrative_sections_prompt(title, digested_notes)
        try:
            raw_narrative = self._llm_client.generate(
                narrative_prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise AnalysisError(
                f"Failed to generate narrative sections for article {article.id}: {exc}"
            ) from exc

        list_prompt = self._prompt_builder.build_list_sections_prompt(title, digested_notes)
        try:
            raw_lists = self._llm_client.generate(
                list_prompt, system_prompt=self._prompt_builder.system_prompt
            )
        except LLMError as exc:
            raise AnalysisError(
                f"Failed to generate list sections for article {article.id}: {exc}"
            ) from exc

        try:
            narrative_fields = self._parser.parse_narrative_sections(raw_narrative)
            list_fields = self._parser.parse_list_sections(raw_lists)
        except AnalysisParseError as exc:
            raise AnalysisError(
                f"Article {article.id}: could not parse chunked analysis output: {exc}"
            ) from exc

        return ArticleAnalysis(**narrative_fields, **list_fields)
