"""Configuration module for VeillIA Summarizer.

Loads and validates configuration from environment variables (via a .env
file). Centralizing configuration here means every other module depends
only on typed, validated config objects (Dependency Inversion Principle)
rather than reading `os.environ` directly, which keeps the rest of the
codebase easy to test and reason about.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

from exceptions import ConfigurationError

# Load variables from a local .env file (if present) into the environment.
# Safe to call even if no .env file exists.
load_dotenv()


def _get_env(name: str, default: str | None = None, required: bool = False) -> str:
    value = os.getenv(name, default)
    if required and not value:
        raise ConfigurationError(f"Missing required environment variable: {name}")
    return value or ""


def _get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigurationError(f"Environment variable {name} must be an integer, got: {raw!r}") from exc


def _get_env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise ConfigurationError(f"Environment variable {name} must be a float, got: {raw!r}") from exc


def _get_env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes")


@dataclass(frozen=True)
class SupabaseConfig:
    """Connection details for the Supabase project holding `articles`."""

    url: str
    key: str
    table_name: str = "articles"


@dataclass(frozen=True)
class OllamaConfig:
    """Connection and generation settings for the local Ollama server.

    `model` can be any model pulled locally (e.g. "llama3.2", "qwen2.5",
    "mistral"), and can be changed purely via the OLLAMA_MODEL env var.
    """

    # Use the literal loopback IP rather than "localhost": on some systems
    # (notably Windows) "localhost" resolves to the IPv6 address ::1 first,
    # and if Ollama isn't listening on IPv6 the connection just hangs until
    # the request times out -- which looks exactly like a slow model, not a
    # network problem. "127.0.0.1" sidesteps that DNS/resolution step.
    base_url: str = "http://127.0.0.1:11434"
    model: str = "llama3.2"
    timeout_seconds: int =300
    temperature: float = 0.3
    max_retries: int = 3
    retry_backoff_seconds: float = 2.0
    # How long Ollama keeps the model loaded in memory after a request.
    # Keeping it loaded across a whole batch avoids repeated (slow) reloads
    # on machines with limited RAM. "5m" = 5 minutes, "-1" = never unload.
    keep_alive: str = "-1m"


@dataclass(frozen=True)
class SummarizationConfig:
    """Business rules for what a "good" summary looks like.

    The summary is intentionally short -- a scannable teaser (2-3
    sentences) that lets a reader grasp the main idea in seconds. Depth
    lives in the separate structured `analysis` (see AnalysisConfig /
    analysis_main.py), not here.
    """

    min_words: int = 30
    max_words: int = 60
    batch_size: int = 10
    language: str = "en"
    # Chunked ("split -> summarize each part -> merge") summarization is
    # used by default: each LLM call handles a smaller piece of the
    # article, which is faster and lighter on RAM than one big prompt, and
    # avoids losing the end of long articles to truncation.
    use_chunking: bool = True
    num_chunks: int = 3
    # Articles shorter than this are summarized in a single pass regardless
    # of `use_chunking` -- not worth splitting a short article into thirds.
    chunking_min_chars: int = 600


@dataclass(frozen=True)
class ClassificationConfig:
    """Settings for the topic classification pipeline.

    Classification prompts are much smaller than summarization prompts (the
    model only needs to output one category word), so a larger batch size
    and a tighter content cap are usually fine even on constrained machines.
    """

    batch_size: int = 20
    max_content_chars: int = 3000
    # Chunked classification (split article -> classify each part -> majority
    # vote) keeps each individual LLM call small, avoiding the timeouts long
    # single-prompt classification can cause on memory-constrained machines.
    use_chunking: bool = True
    num_chunks: int = 3
    chunking_min_chars: int = 600


@dataclass(frozen=True)
class AnalysisConfig:
    """Settings for the structured article-analysis pipeline.

    A larger content budget than classification's, since a good business
    analysis needs more context than a one-word category does -- but still
    capped, for the same RAM/latency reasons as everywhere else.
    """

    batch_size: int = 10
    max_content_chars: int = 4000
    # Deliberately low: many scraped articles only have a short excerpt
    # rather than full page text. The goal is a best-effort analysis from
    # whatever is available, not skipping most of the table.
    min_content_chars: int = 30
    min_summary_words: int = 8
    min_insight_words: int = 3
    # Chunked analysis (split -> extract notes -> 2 lighter generation calls
    # instead of 1 heavy 7-section call) -- the single biggest lever for
    # avoiding timeouts on memory-constrained machines, since a full,
    # single-call analysis is the heaviest request in the whole project.
    use_chunking: bool = True
    num_chunks: int = 3
    chunking_min_chars: int = 800


@dataclass(frozen=True)
class ChatConfig:
    """Settings for the Article AI Chat API.

    max_content_chars/max_history_turns bound how much context is sent to
    the model on every request -- important for latency, since (unlike the
    batch pipelines) a chat reply needs to feel responsive to a waiting user.
    """

    host: str = "0.0.0.0"
    port: int = 8000
    max_content_chars: int = 3000
    # Much smaller when a stored `analysis` already exists for the article
    # -- the structured analysis already distills the facts, so the raw
    # excerpt is only a minor supplement, not the primary context.
    max_content_chars_with_analysis: int = 800
    max_history_turns: int = 12


@dataclass(frozen=True)
class AppConfig:
    """Top-level, immutable application configuration."""

    supabase: SupabaseConfig
    ollama: OllamaConfig
    summarization: SummarizationConfig
    classification: ClassificationConfig
    analysis: AnalysisConfig
    chat: ChatConfig
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Build an AppConfig from environment variables / .env file.

        Raises:
            ConfigurationError: if required variables are missing or malformed.
        """
        supabase = SupabaseConfig(
            url=_get_env("SUPABASE_URL", required=True),
            key=_get_env("SUPABASE_KEY", required=True),
            table_name=_get_env("SUPABASE_TABLE", default="articles"),
        )
        ollama = OllamaConfig(
            base_url=_get_env("OLLAMA_URL", default="http://127.0.0.1:11434"),
            model=_get_env("OLLAMA_MODEL", default="llama3.2"),
            timeout_seconds=_get_env_int("OLLAMA_TIMEOUT_SECONDS", 120),
            temperature=_get_env_float("OLLAMA_TEMPERATURE", 0.3),
            max_retries=_get_env_int("OLLAMA_MAX_RETRIES", 3),
            retry_backoff_seconds=_get_env_float("OLLAMA_RETRY_BACKOFF_SECONDS", 2.0),
            keep_alive=_get_env("OLLAMA_KEEP_ALIVE", default="5m"),
        )
        summarization = SummarizationConfig(
            min_words=_get_env_int("SUMMARY_MIN_WORDS", 30),
            max_words=_get_env_int("SUMMARY_MAX_WORDS", 60),
            batch_size=_get_env_int("BATCH_SIZE", 10),
            language=_get_env("SUMMARY_LANGUAGE", default="en"),
            use_chunking=_get_env_bool("SUMMARY_USE_CHUNKING", True),
            num_chunks=_get_env_int("SUMMARY_NUM_CHUNKS", 3),
            chunking_min_chars=_get_env_int("SUMMARY_CHUNKING_MIN_CHARS", 600),
        )
        classification = ClassificationConfig(
            batch_size=_get_env_int("CLASSIFICATION_BATCH_SIZE", 20),
            max_content_chars=_get_env_int("CLASSIFICATION_MAX_CONTENT_CHARS", 3000),
            use_chunking=_get_env_bool("CLASSIFICATION_USE_CHUNKING", True),
            num_chunks=_get_env_int("CLASSIFICATION_NUM_CHUNKS", 3),
            chunking_min_chars=_get_env_int("CLASSIFICATION_CHUNKING_MIN_CHARS", 600),
        )
        analysis = AnalysisConfig(
            batch_size=_get_env_int("ANALYSIS_BATCH_SIZE", 10),
            max_content_chars=_get_env_int("ANALYSIS_MAX_CONTENT_CHARS", 4000),
            min_content_chars=_get_env_int("ANALYSIS_MIN_CONTENT_CHARS", 30),
            min_summary_words=_get_env_int("ANALYSIS_MIN_SUMMARY_WORDS", 8),
            min_insight_words=_get_env_int("ANALYSIS_MIN_INSIGHT_WORDS", 3),
            use_chunking=_get_env_bool("ANALYSIS_USE_CHUNKING", True),
            num_chunks=_get_env_int("ANALYSIS_NUM_CHUNKS", 3),
            chunking_min_chars=_get_env_int("ANALYSIS_CHUNKING_MIN_CHARS", 800),
        )
        chat = ChatConfig(
            host=_get_env("CHAT_HOST", default="0.0.0.0"),
            port=_get_env_int("CHAT_PORT", 8000),
            max_content_chars=_get_env_int("CHAT_MAX_CONTENT_CHARS", 3000),
            max_content_chars_with_analysis=_get_env_int("CHAT_MAX_CONTENT_CHARS_WITH_ANALYSIS", 800),
            max_history_turns=_get_env_int("CHAT_MAX_HISTORY_TURNS", 12),
        )
        return cls(
            supabase=supabase,
            ollama=ollama,
            summarization=summarization,
            classification=classification,
            analysis=analysis,
            chat=chat,
            log_level=_get_env("LOG_LEVEL", default="INFO"),
        )
