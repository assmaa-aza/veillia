"""Abstract interface for LLM backends.

This is the key extension point of the system (Open/Closed Principle): to
support a new local model runtime (e.g. llama.cpp, LM Studio, vLLM) you
only need to add a new class implementing `LLMClient`. Nothing in
`services/pipeline.py` or `llm/summarizer.py` needs to change.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from models.chat import ChatTurn


class LLMClient(ABC):
    """Contract that any LLM backend (local or, later, remote) must satisfy."""

    @abstractmethod
    def generate(self, prompt: str, *, system_prompt: str | None = None) -> str:
        """Generate text for a single-turn prompt.

        Args:
            prompt: The user-level prompt.
            system_prompt: Optional system-level instructions.

        Returns:
            The generated text.

        Raises:
            LLMError: if generation fails after any internal retries.
        """
        raise NotImplementedError

    @abstractmethod
    def chat(self, messages: list[ChatTurn], *, system_prompt: str | None = None) -> str:
        """Generate a reply to a multi-turn conversation.

        Unlike `generate()`, this preserves conversational structure
        (distinct user/assistant turns) rather than flattening everything
        into one prompt string -- used by the article chat assistant so
        follow-up questions are answered with proper conversational context.

        Args:
            messages: The conversation so far, oldest first, ending with
                the latest user message.
            system_prompt: Optional system-level instructions (e.g.
                grounding rules + article context for the chat assistant).

        Returns:
            The assistant's reply text.

        Raises:
            LLMError: if generation fails after any internal retries.
        """
        raise NotImplementedError

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if the backend is reachable and the model is ready to use."""
        raise NotImplementedError

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Identifier of the model currently in use (for logging/metrics)."""
        raise NotImplementedError
