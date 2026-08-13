"""Ollama-backed implementation of the LLMClient interface.

Ollama (https://ollama.com) runs open-source models such as Llama 3.2,
Qwen 2.5, and Mistral entirely locally and exposes a simple REST API,
which keeps this integration free of any paid/cloud AI service.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import requests

from config import OllamaConfig
from exceptions import LLMError
from llm.base import LLMClient
from models.chat import ChatTurn

logger = logging.getLogger(__name__)


class OllamaClient(LLMClient):
    """Talks to a local Ollama server via its REST API.

    Ollama must already be running (default: http://127.0.0.1:11434) with
    the configured model pulled, e.g.:

        ollama pull llama3.2
    """

    def __init__(self, config: OllamaConfig) -> None:
        self._config = config
        self._session = requests.Session()

    @property
    def model_name(self) -> str:
        return self._config.model

    def health_check(self) -> bool:
        """Verify Ollama is reachable and the configured model is available."""
        try:
            response = self._session.get(f"{self._config.base_url}/api/tags", timeout=10)
            response.raise_for_status()
            available_models = [m.get("name", "") for m in response.json().get("models", [])]

            # Ollama tags often include a suffix, e.g. "llama3.2:latest".
            model_found = any(
                name == self._config.model or name.startswith(f"{self._config.model}:")
                for name in available_models
            )
            if not model_found:
                logger.warning(
                    "Model '%s' not found on Ollama server. Available models: %s",
                    self._config.model,
                    available_models or "(none pulled yet)",
                )
            return model_found
        except requests.RequestException as exc:
            logger.error(
                "Could not reach Ollama at %s (%s). Is `ollama serve` running?",
                self._config.base_url,
                exc,
            )
            return False
    def warm_up(self) -> None:
        """Send a trivial prompt once at startup so the model is fully loaded
        into memory before real work begins -- avoids the first (or every,
        if keep_alive isn't holding) request paying model-load latency."""
        try:
            self._request_with_retries(
                "/api/generate",
                {
                    "model": self._config.model,
                    "prompt": "Hi",
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 1},
                    "keep_alive": self._config.keep_alive,
                },
                retry_label="warm-up",
            )
        except LLMError as exc:
            logger.warning("Ollama warm-up failed (continuing anyway): %s", exc)
    def generate(self, prompt: str, *, system_prompt: str | None = None) -> str:
        """Call Ollama's /api/generate endpoint, retrying on transient failures."""
        payload = {
            "model": self._config.model,
            "prompt": prompt,
            "system": system_prompt or "",
            "stream": False,
            "options": {"temperature": self._config.temperature},
            "keep_alive": self._config.keep_alive,
        }
        data = self._request_with_retries("/api/generate", payload, retry_label="generation")
        text = (data.get("response") or "").strip()
        if not text:
            raise LLMError("Ollama returned an empty response.")
        return text

    def chat(self, messages: list[ChatTurn], *, system_prompt: str | None = None) -> str:
        """Call Ollama's /api/chat endpoint with structured conversation turns.

        Using /api/chat (rather than flattening everything into one
        /api/generate prompt) lets the model see distinct user/assistant
        turns, which tends to produce more coherent follow-up answers in a
        multi-turn conversation like the article chat assistant.
        """
        ollama_messages: list[dict[str, str]] = []
        if system_prompt:
            ollama_messages.append({"role": "system", "content": system_prompt})
        ollama_messages.extend({"role": turn.role, "content": turn.content} for turn in messages)

        payload = {
            "model": self._config.model,
            "messages": ollama_messages,
            "stream": False,
            "options": {"temperature": self._config.temperature},
            "keep_alive": self._config.keep_alive,
        }
        data = self._request_with_retries("/api/chat", payload, retry_label="chat")
        text = (data.get("message") or {}).get("content", "").strip()
        if not text:
            raise LLMError("Ollama returned an empty chat response.")
        return text
    def _keep_alive_payload_value(self) -> str | int:
        """Ollama accepts keep_alive as an int (seconds) or a duration string
        with a unit (e.g. "5m", "-1m") -- but NOT a bare numeric string like
        "-1" (no unit), which the server rejects with 400 Bad Request."""
        raw = self._config.keep_alive.strip()
        if raw.lstrip("-").isdigit():
            return int(raw)  # bare number -> send as a real JSON int
        return raw
    def _request_with_retries(
        self, endpoint: str, payload: dict[str, Any], *, retry_label: str
    ) -> dict[str, Any]:
        """POST to Ollama with retries/backoff, shared by generate() and chat()."""
        last_error: Exception | None = None
        for attempt in range(1, self._config.max_retries + 1):
            try:
                response = self._session.post(
                    f"{self._config.base_url}{endpoint}",
                    json=payload,
                    timeout=self._config.timeout_seconds,
                )
                response.raise_for_status()
                return response.json()
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                logger.warning(
                    "Ollama %s attempt %d/%d failed: %s",
                    retry_label,
                    attempt,
                    self._config.max_retries,
                    exc,
                )
                if attempt < self._config.max_retries:
                    time.sleep(self._config.retry_backoff_seconds * attempt)

        raise LLMError(
            f"Ollama {retry_label} failed after {self._config.max_retries} attempt(s): {last_error}"
        )
