"""
utils/ai_relevance.py
----------------------
Keyword-based AI-relevance filter.

Why this exists
-----------------
Every existing source in `config.SOURCES` is AI-specific by construction
(OpenAI's own blog, Anthropic's own newsroom, etc.), so nothing needs to
be filtered -- everything a collector returns is, by definition, AI news.

The new "events / competitions / opportunities" sources (Meetup,
Devpost, mmsp.gov.ma, Technopark, Civica) are general-purpose platforms:
Meetup hosts every kind of meetup, Devpost lists every kind of
hackathon, and the Moroccan sites publish general
entrepreneurship/administration news. Left unfiltered, their collectors
would flood the pipeline with irrelevant items.

This module centralizes a single keyword list (EN/FR/AR) and a single
`is_ai_relevant()` check so every new collector applies the exact same
definition of "AI-relevant" instead of five slightly different regexes.

Design notes
------------
- Matching is deliberately keyword-based, not ML-based: it's fast,
  dependency-free, fully deterministic/testable, and good enough for a
  first pass -- consistent with the rest of this pipeline's "simple,
  pure, testable" philosophy (see README > Testing the pipeline logic).
- English/French terms are matched with word boundaries (`\b`) so short
  tokens like "AI" or "IA" don't match substrings inside unrelated
  words (e.g. "IA" inside "diagnostic" -- Latin script has no natural
  word separator otherwise). Arabic terms don't need this: Arabic
  script doesn't have the same false-positive-substring risk for these
  particular phrases, and `\b` behaves unreliably around Arabic text
  in Python's `re` module, so those are matched as plain substrings.
- This is intentionally a *broad* filter (a "false positive" survives
  to be seen by a human downstream; a false negative silently drops a
  real AI event). When in doubt, keywords lean permissive.
"""

from __future__ import annotations

import re

# Terms matched with a Latin-script word boundary. Case-insensitive.
_LATIN_KEYWORDS = [
    "ai",
    "a.i.",
    "artificial intelligence",
    "intelligence artificielle",
    "machine learning",
    "apprentissage automatique",
    "deep learning",
    "apprentissage profond",
    "generative ai",
    "ia generative",
    "ia générative",
    "genai",
    "llm",
    "large language model",
    "grand modele de langage",
    "grand modèle de langage",
    "neural network",
    "reseau de neurones",
    "réseau de neurones",
    "chatbot",
    "data science",
    "science des donnees",
    "science des données",
    "computer vision",
    "vision par ordinateur",
    "nlp",
    "traitement du langage naturel",
    "ia",
    "machine learning",
    "agentic ai",
    "ai agent",
    "agent ia",
]

# Terms matched as plain (accent/case-insensitive) substrings -- used for
# Arabic, where `\b` word-boundary semantics don't apply cleanly.
_SUBSTRING_KEYWORDS = [
    "ذكاء اصطناعي",
    "الذكاء الاصطناعي",
    "تعلم الآلة",
    "تعلم آلي",
    "الذكاء الإصطناعي",
]

_LATIN_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in _LATIN_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def is_ai_relevant(*texts: str | None) -> bool:
    """Return True if any of the given text fields mention AI.

    Args:
        *texts: Any number of text fields to check (title, summary,
            content, tags joined into a string, etc.). None/empty
            values are skipped safely.

    Returns:
        True if at least one AI-related keyword (English, French, or
        Arabic) is found in any of the given texts.
    """
    for text in texts:
        if not text:
            continue
        if _LATIN_PATTERN.search(text):
            return True
        for keyword in _SUBSTRING_KEYWORDS:
            if keyword in text:
                return True
    return False


# --------------------------------------------------------------------------
# Event / competition / opportunity type classification
# --------------------------------------------------------------------------
# Per the project's schema decision: we don't extend the Article model
# with a dedicated "type" field. Instead every new collector tags its
# articles with exactly one of these three values in `Article.tags`, so
# downstream consumers can filter/group by type using the existing
# `tags` field alone.

_COMPETITION_KEYWORDS = [
    "hackathon",
    "concours",
    "competition",
    "challenge",
    "compétition",
    "prix",
    "award",
    "مسابقة",
]

_OPPORTUNITY_KEYWORDS = [
    "appel a candidature",
    "appel à candidature",
    "appel a projets",
    "appel à projets",
    "call for applications",
    "call for proposals",
    "candidature",
    "financement",
    "funding",
    "grant",
    "bourse",
    "recrutement",
    "opportunity",
    "opportunité",
    "فرصة",
    "منحة",
]

_EVENT_KEYWORDS = [
    "conference",
    "conférence",
    "workshop",
    "atelier",
    "seminaire",
    "séminaire",
    "forum",
    "assises",
    "meetup",
    "webinar",
    "webinaire",
    "afterwork",
    "table ronde",
    "ندوة",
    "ورشة",
]


def classify_type(*texts: str | None) -> str:
    """Best-effort classification into "Competition", "Opportunity", or
    "Event", based on keyword hints in the given text fields.

    Falls back to "Event" when nothing more specific matches, since an
    unclassified listing on these sites is still, most commonly, some
    kind of dated happening (talk, launch, ceremony, etc.).
    """
    blob = " ".join(t.lower() for t in texts if t)

    for keyword in _COMPETITION_KEYWORDS:
        if keyword in blob:
            return "Competition"
    for keyword in _OPPORTUNITY_KEYWORDS:
        if keyword in blob:
            return "Opportunity"
    for keyword in _EVENT_KEYWORDS:
        if keyword in blob:
            return "Event"
    return "Event"