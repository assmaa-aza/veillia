"""
VeillIA Article Chat API - Entry point.

Runs the FastAPI backend for the Article AI Chat as a long-lived server
process (unlike the other pipelines, which are one-shot batch scripts) --
a live chat needs to respond to requests as users type them.

Usage:
    python chat_server_main.py

Then, from the frontend (or curl, for testing):
    POST http://localhost:8000/articles/{article_id}/chat
    {
        "message": "What does fine-tuning mean?",
        "conversation_history": [
            {"role": "user", "content": "What is this article about?"},
            {"role": "assistant", "content": "..."}
        ]
    }

Shares configuration with the other pipelines (.env) -- see .env.example
for CHAT_HOST / CHAT_PORT / CHAT_MAX_CONTENT_CHARS / CHAT_MAX_HISTORY_TURNS.
"""
from __future__ import annotations

import logging
import sys

import uvicorn

from config import AppConfig, ConfigurationError
from logging_config import setup_logging

logger = logging.getLogger(__name__)


def main() -> int:
    try:
        config = AppConfig.from_env()
    except ConfigurationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1

    setup_logging(config.log_level)
    logger.info(
        "Starting VeillIA Article Chat API on %s:%d (model=%s)",
        config.chat.host, config.chat.port, config.ollama.model,
    )

    # api.app builds its own dependencies from AppConfig.from_env() during
    # its lifespan startup hook, so a fresh process always reflects the
    # current .env -- nothing further to wire up here.
    uvicorn.run("api.app:app", host=config.chat.host, port=config.chat.port, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main())
