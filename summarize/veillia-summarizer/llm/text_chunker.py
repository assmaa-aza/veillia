"""Utility for splitting long text into roughly-equal chunks.

Kept as its own small, dependency-free class (Single Responsibility) so it
can be tested and reused independently of summarization -- e.g. the same
chunker could later serve embeddings or classification of very long
documents.
"""
from __future__ import annotations


class TextChunker:
    """Splits text into `num_chunks` pieces, breaking on whitespace.

    This is intentionally simple (no sentence/paragraph-aware splitting):
    good enough for feeding roughly-equal, non-mid-word fragments to an
    LLM, without pulling in an NLP dependency for something this small.
    """

    @staticmethod
    def split(text: str, num_chunks: int = 3) -> list[str]:
        """Split `text` into up to `num_chunks` non-empty fragments, in order.

        Each split point is nudged forward to the next whitespace so words
        are never cut in half. If `text` is shorter than `num_chunks`
        meaningful fragments, fewer (non-empty) chunks are returned.
        """
        text = text.strip()
        if not text or num_chunks < 1:
            return []

        length = len(text)
        target_size = max(1, length // num_chunks)

        chunks: list[str] = []
        start = 0
        for i in range(num_chunks):
            if start >= length:
                break

            is_last = i == num_chunks - 1
            end = length if is_last else min(start + target_size, length)

            # Nudge forward to the next whitespace so we don't cut a word
            # in half (skip this for the final chunk, which already runs
            # to the end of the text).
            if not is_last:
                while end < length and not text[end].isspace():
                    end += 1

            fragment = text[start:end].strip()
            if fragment:
                chunks.append(fragment)
            start = end

        return chunks
