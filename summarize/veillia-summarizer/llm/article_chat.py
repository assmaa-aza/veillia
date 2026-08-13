"""Article chat assistant service.

Combines `ArticleChatPromptBuilder` with an `LLMClient` to answer a user's
question about a specific article, grounded in that article's stored
content and already-generated analysis -- no new analysis is generated
per request (the whole point is to reuse what's already in the database
for low latency).
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from exceptions import ChatError, LLMError
from llm.base import LLMClient
from llm.chat_prompt import ArticleChatPromptBuilder
from models.analysis import ArticleAnalysis
from models.article import Article
from models.chat import ChatTurn

logger = logging.getLogger(__name__)


class ArticleChatAssistant(ABC):
    """Interface for anything capable of answering a question about an article."""

    @abstractmethod
    def reply(
        self,
        article: Article,
        conversation_history: list[ChatTurn],
        message: str,
    ) -> str:
        raise NotImplementedError


class LLMArticleChatAssistant(ArticleChatAssistant):
    """Chat assistant implementation backed by any LLMClient (e.g. Ollama)."""

    def __init__(self, llm_client: LLMClient, prompt_builder: ArticleChatPromptBuilder) -> None:
        self._llm_client = llm_client
        self._prompt_builder = prompt_builder

    def reply(
        self,
        article: Article,
        conversation_history: list[ChatTurn],
        message: str,
    ) -> str:
        if not message or not message.strip():
            raise ChatError("Message cannot be empty.")

        analysis = ArticleAnalysis.from_dict(article.analysis) if article.analysis else None
        system_prompt = self._prompt_builder.build_system_prompt(article, analysis)
        messages = self._prompt_builder.build_messages(conversation_history, message)

        try:
            reply = self._llm_client.chat(messages, system_prompt=system_prompt)
        except LLMError as exc:
            raise ChatError(f"Failed to generate a chat reply for article {article.id}: {exc}") from exc

        return reply.strip()
