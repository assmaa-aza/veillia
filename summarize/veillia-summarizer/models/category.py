"""Topic categories for AI news classification.

Kept as its own module (rather than inline strings scattered around) so the
list of valid categories has exactly one source of truth, used by the
prompt, the validator, and the database layer alike.
"""
from __future__ import annotations

import re
import unicodedata
from enum import Enum


class Category(str, Enum):
    """The fixed set of topics an article can be classified into.

    Values are the exact strings persisted in Supabase's `category` column
    -- lowercase, unaccented ASCII, regardless of what language the model
    answered in.
    """

    RECHERCHE = "recherche"
    STARTUP = "startup"
    ECOSYSTEME = "ecosysteme"
    EVENEMENT = "evenement"
    TENDANCE = "tendance"
    REGLEMENTATION = "reglementation"
    PRODUIT_IA = "produit_ia"

    @classmethod
    def values(cls) -> list[str]:
        return [c.value for c in cls]

    @classmethod
    def from_text(cls, text: str) -> "Category | None":
        """Best-effort, language-independent parse of raw LLM output into a
        known Category.

        The classifier prompt asks for a French category name, but models
        sometimes drift into English or another language (e.g. "Research"
        instead of "Recherche"). This maps common translations and minor
        spelling/accent variations back to the canonical (French, ASCII)
        `Category` value, so a language slip never causes an article to be
        silently dropped.

        Returns None only if nothing recognizable is found at all.
        """
        normalized = _normalize(text)
        if not normalized:
            return None

        # 1) Exact match against a canonical value or any known alias.
        for category in cls:
            if normalized == _normalize(category.value):
                return category
            if normalized in _ALIASES.get(category, ()):
                return category

        # 2) Fallback: the model sometimes wraps the label in extra words
        # (e.g. "Category: startup", "This article is about research").
        # Look for a canonical value or alias as a substring of the output.
        for category in cls:
            candidates = (_normalize(category.value), *_ALIASES.get(category, ()))
            for candidate in candidates:
                if candidate and candidate in normalized:
                    return category

        return None


def _normalize(text: str) -> str:
    """Lowercase, strip accents/diacritics, and collapse punctuation to
    single spaces -- makes matching insensitive to accents, casing, and
    minor punctuation differences (e.g. "Écosystème." -> "ecosysteme").
    """
    text = text.strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return text


# Known translations / spelling variants per category, already normalized
# (lowercase, unaccented, single spaces) via _normalize() at import time.
# Extend this list whenever a new drift pattern shows up in the logs --
# it's the single place that controls language-independent matching.
_RAW_ALIASES: dict[Category, list[str]] = {
    Category.RECHERCHE: [
        "recherche", "recherches", "research", "researches", "study", "studies",
    ],
    Category.STARTUP: [
        "startup", "startups", "start up", "start ups",
    ],
    Category.ECOSYSTEME: [
        "ecosysteme", "ecosystemes", "ecosystem", "ecosystems", "eco system",
    ],
    Category.EVENEMENT: [
        "evenement", "evenements", "event", "events",
    ],
    Category.TENDANCE: [
        "tendance", "tendances", "trend", "trends", "tendency", "tendencies",
    ],
    Category.REGLEMENTATION: [
        "reglementation", "reglementations", "regulation", "regulations",
        "policy", "policies", "law", "laws",
    ],
    Category.PRODUIT_IA: [
        "produit ia", "produit", "produits", "product", "products",
        "ai product", "ai products", "product ia", "ia product",
    ],
}

_ALIASES: dict[Category, set[str]] = {
    category: {_normalize(alias) for alias in aliases}
    for category, aliases in _RAW_ALIASES.items()
}


CATEGORY_DESCRIPTIONS: dict[Category, str] = {
    Category.RECHERCHE: "Recherche scientifique, nouveaux modèles/algorithmes, publications, avancées techniques issues de laboratoires ou d'universités.",
    Category.STARTUP: "Startups IA : levées de fonds, lancements de produits, acquisitions, croissance d'une jeune entreprise.",
    Category.ECOSYSTEME: "Écosystème IA au sens large : partenariats, plateformes, grandes entreprises, infrastructure, outils.",
    Category.EVENEMENT: "Événements : conférences, sommets, hackathons, salons, annonces liées à un événement précis.",
    Category.TENDANCE: "Tendances et dynamiques du marché IA : adoption, usages émergents, évolutions de fond observées dans le secteur.",
    Category.REGLEMENTATION: "Réglementation, lois, politiques publiques, gouvernance et éthique liées à l'IA.",
    Category.PRODUIT_IA: "Produit IA : lancement, mise à jour ou fonctionnalité d'un produit ou service basé sur l'IA (hors levée de fonds/startup).",
}

# Human-readable French label shown to the model in the prompt. Kept
# separate from `Category.value` (the ASCII slug persisted in Supabase) so
# the model reads a natural "Produit IA" while the database still stores
# "produit_ia" -- matching stays language-independent either way via
# `Category.from_text`.
CATEGORY_DISPLAY_NAMES: dict[Category, str] = {
    Category.RECHERCHE: "Recherche",
    Category.STARTUP: "Startup",
    Category.ECOSYSTEME: "Écosystème",
    Category.EVENEMENT: "Événement",
    Category.TENDANCE: "Tendance",
    Category.REGLEMENTATION: "Réglementation",
    Category.PRODUIT_IA: "Produit IA",
}
