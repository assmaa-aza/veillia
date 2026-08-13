"""FastAPI app exposing the Article AI Chat endpoint.

Run with:
    python chat_server_main.py

or directly with uvicorn:
    uvicorn api.app:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException

from api.dependencies import ApiDependencies, get_dependencies, init_dependencies
from api.schemas import ChatRequest, ChatResponse
from config import AppConfig, ConfigurationError
from exceptions import ChatError, DatabaseError
from models.chat import ChatTurn

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        config = AppConfig.from_env()
    except ConfigurationError as exc:
        logger.error("Configuration error: %s", exc)
        raise
    init_dependencies(config)
    yield


app = FastAPI(
    title="VeillIA Article Chat API",
    description="Backend for the Article AI Chat: ask questions about a "
    "specific article, grounded in its stored content and analysis.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health(deps: ApiDependencies = Depends(get_dependencies)) -> dict:
    """Basic liveness check -- does NOT hit Ollama (kept fast for load balancers)."""
    return {"status": "ok", "model": deps.config.ollama.model}


@app.post(
    "/articles/{article_id}/chat",
    response_model=ChatResponse,
    responses={404: {"description": "Article not found"}, 503: {"description": "LLM backend unavailable"}},
)
def chat_with_article(
    article_id: int,
    request: ChatRequest,
    deps: ApiDependencies = Depends(get_dependencies),
) -> ChatResponse:
    """Answer a question about a specific article.

    Retrieves the article (and its already-generated `summary`/`analysis`)
    from the database and uses them as the LLM's only source of truth for
    facts. The conversation history is supplied by the caller each request
    (the backend itself is stateless) so follow-up questions are answered
    with proper context.
    """
    try:
        article = deps.repository.get_article_by_id(article_id)
    except DatabaseError as exc:
        logger.error("Database error fetching article %d: %s", article_id, exc)
        raise HTTPException(status_code=503, detail="Could not reach the database.") from exc

    if article is None:
        raise HTTPException(status_code=404, detail=f"Article {article_id} not found.")

    history = [ChatTurn(role=turn.role, content=turn.content) for turn in request.conversation_history]

    try:
        reply = deps.chat_assistant.reply(article, history, request.message)
    except ChatError as exc:
        logger.error("Chat assistant failed for article %d: %s", article_id, exc)
        raise HTTPException(
            status_code=503,
            detail="The AI assistant is currently unavailable. Please try again shortly.",
        ) from exc

    return ChatResponse(article_id=article_id, reply=reply)
