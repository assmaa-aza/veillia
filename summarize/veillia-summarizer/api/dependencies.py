"""Composition root for the API layer.

Builds each dependency (Supabase repository, Ollama client, prompt
builder, chat assistant) exactly ONCE, at process startup, and reuses the
same instances across every request. This matters for latency: creating a
new Supabase client or `requests.Session` per request would add needless
connection overhead to every chat message.
"""
from __future__ import annotations

import logging

from config import AppConfig
from database.supabase import SupabaseArticleRepository
from llm.article_chat import ArticleChatAssistant, LLMArticleChatAssistant
from llm.chat_prompt import ArticleChatPromptBuilder
from llm.ollama_client import OllamaClient

logger = logging.getLogger(__name__)


class ApiDependencies:
    """Holds the singleton instances used by every API route."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.repository = SupabaseArticleRepository(config.supabase)
        self.llm_client = OllamaClient(config.ollama)
        prompt_builder = ArticleChatPromptBuilder(
            max_content_chars=config.chat.max_content_chars,
            max_content_chars_with_analysis=config.chat.max_content_chars_with_analysis,
            max_history_turns=config.chat.max_history_turns,
        )
        self.chat_assistant: ArticleChatAssistant = LLMArticleChatAssistant(
            self.llm_client, prompt_builder
        )


_dependencies: ApiDependencies | None = None


def get_dependencies() -> ApiDependencies:
    """FastAPI dependency provider -- returns the shared singleton instance."""
    if _dependencies is None:
        raise RuntimeError("API dependencies were not initialized. Call init_dependencies() first.")
    return _dependencies


def init_dependencies(config: AppConfig) -> ApiDependencies:
    """Build the singleton dependencies. Call once, at application startup."""
    global _dependencies
    _dependencies = ApiDependencies(config)
    logger.info("API dependencies initialized (model=%s).", config.ollama.model)
    return _dependencies
