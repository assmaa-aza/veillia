"""
Smart contextual chatbot endpoint for VeillIA.

Uses word-overlap scoring to find the most relevant sentences from an article
when a user asks a question. No external LLM required.
Responds in the user's preferred language (fr/en/ar/darija).
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import re

from app.services.article_service import article_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


# ─── Request / Response schemas ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    preferred_language: str = "Français"


class ChatResponse(BaseModel):
    answer: str
    language: str
    found_in_article: bool


# ─── Localised fallback strings ───────────────────────────────────────────────

NOT_FOUND_MESSAGES = {
    "english":   "This specific information is not available in the article. Try asking about another aspect of the topic.",
    "français":  "Cette information spécifique n'est pas disponible dans l'article. Essayez de poser une question sur un autre aspect du sujet.",
    "عربية":     "هذه المعلومة غير متوفرة في المقال. حاول السؤال عن جانب آخر من الموضوع.",
    "darija":    "هاد المعلومة ما كاينة شي فالمقال. حاول تسول على شي حاجة أخرى فهاد الموضوع.",
}

INTRO_MESSAGES = {
    "english":   "Based on the article content: ",
    "français":  "D'après le contenu de l'article : ",
    "عربية":     "استناداً إلى محتوى المقال: ",
    "darija":    "حسب ما كاين فالمقال: ",
}

CONTEXT_MESSAGES = {
    "english":   " (Source: article content)",
    "français":  " (Source : contenu de l'article)",
    "عربية":     " (المصدر: محتوى المقال)",
    "darija":    " (المصدر: محتوى المقال)",
}


def _normalize_lang_key(lang: str) -> str:
    """Map preferred_language string to our internal key."""
    lower = lang.lower()
    if "en" in lower or "english" in lower:
        return "english"
    if "ar" in lower or "عرب" in lower or "arabic" in lower or "عربية" in lower:
        return "عربية"
    if "darija" in lower or "دارجة" in lower or "moroccan" in lower:
        return "darija"
    return "français"


def _tokenize(text: str) -> set:
    """Lower-case word tokenization, strips punctuation."""
    words = re.findall(r'\b\w+\b', text.lower())
    # Remove very common stopwords (fr/en/ar)
    stopwords = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "in", "on", "at", "to", "for", "of", "and", "or", "but", "not",
        "le", "la", "les", "de", "du", "des", "un", "une", "et", "en",
        "est", "sont", "avec", "sur", "pour", "par", "que", "qui", "dans",
        "il", "elle", "ils", "elles", "se", "ce", "cet", "cette", "ces",
        "من", "في", "على", "إلى", "هذا", "هذه", "التي", "الذي", "أو",
        "this", "that", "these", "those", "it", "its", "with", "by", "from",
    }
    return set(words) - stopwords


def _score_sentence(sentence: str, question_tokens: set) -> float:
    """Jaccard-like overlap score between sentence words and question words."""
    sentence_tokens = _tokenize(sentence)
    if not sentence_tokens or not question_tokens:
        return 0.0
    intersection = sentence_tokens & question_tokens
    union = sentence_tokens | question_tokens
    return len(intersection) / len(union)


def _split_sentences(text: str) -> list:
    """Split text into sentences on common delimiters."""
    parts = re.split(r'(?<=[.!?؟])\s+', text.strip())
    # Also split on newlines
    sentences = []
    for p in parts:
        for sub in p.split('\n'):
            sub = sub.strip()
            if len(sub) > 20:
                sentences.append(sub)
    return sentences


def _find_best_answer(article: dict, question: str, lang_key: str) -> tuple[str, bool]:
    """
    Search article content and summary for the most relevant answer.
    Returns (answer_text, found_in_article).
    """
    # Combine content and summary for searching
    full_text = " ".join(filter(None, [
        article.get("summary") or "",
        article.get("content") or "",
    ]))

    if not full_text.strip():
        return NOT_FOUND_MESSAGES[lang_key], False

    question_tokens = _tokenize(question)
    if not question_tokens:
        # Generic summary response
        summary = article.get("summary") or ""
        if summary:
            intro = INTRO_MESSAGES[lang_key]
            return f"{intro}{summary[:500]}", True
        return NOT_FOUND_MESSAGES[lang_key], False

    sentences = _split_sentences(full_text)
    if not sentences:
        return NOT_FOUND_MESSAGES[lang_key], False

    # Score each sentence
    scored = [(s, _score_sentence(s, question_tokens)) for s in sentences]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Take top 2-3 sentences with score > threshold
    THRESHOLD = 0.06
    top = [s for s, score in scored if score >= THRESHOLD][:3]

    if not top:
        # Try with a lower threshold to give something useful
        very_low = [s for s, score in scored if score >= 0.02][:2]
        if very_low:
            intro = INTRO_MESSAGES[lang_key]
            ctx = CONTEXT_MESSAGES[lang_key]
            return f"{intro}{' '.join(very_low)}{ctx}", True
        return NOT_FOUND_MESSAGES[lang_key], False

    intro = INTRO_MESSAGES[lang_key]
    ctx = CONTEXT_MESSAGES[lang_key]
    answer_body = " ".join(top)

    # Cap at ~600 chars for readability
    if len(answer_body) > 600:
        answer_body = answer_body[:597] + "…"

    return f"{intro}{answer_body}{ctx}", True


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/article/{article_id}", response_model=ChatResponse)
def chat_with_article(
    article_id: int,
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Smart contextual Q&A for a single article.
    Requires authentication. Responds in the user's preferred language.
    """
    article = article_service.get_article_by_id(article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article {article_id} not found.",
        )

    lang_key = _normalize_lang_key(body.preferred_language)
    answer, found = _find_best_answer(article, body.question, lang_key)

    return ChatResponse(
        answer=answer,
        language=lang_key,
        found_in_article=found,
    )
