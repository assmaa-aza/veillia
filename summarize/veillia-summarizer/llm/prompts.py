"""Prompt construction for article summarization.

Isolating prompt text here (rather than inlining it in the summarizer)
means prompts can evolve, be A/B tested, or be swapped for multilingual
variants without touching any orchestration logic.
"""
from __future__ import annotations

from dataclasses import dataclass

from models.article import Article
from models.category import CATEGORY_DESCRIPTIONS, CATEGORY_DISPLAY_NAMES, Category

SYSTEM_PROMPT = (
    "You are a professional technology news editor writing short, engaging "
    "teaser summaries for a technology intelligence platform. Readers scan "
    "these summaries to quickly decide what matters to them -- they are not "
    "the in-depth analysis (that exists separately). You write factual, "
    "objective, and tightly concise summaries. You NEVER invent facts, "
    "numbers, names, quotes, or events that are not explicitly present in "
    "the source text. If the article does not contain enough information "
    "to address something, you simply omit it rather than guessing or "
    "assuming."
)


@dataclass(frozen=True)
class PromptBuilder:
    """Builds LLM prompts for the summarization task.

    Attributes:
        min_words: Lower bound guideline for summary length.
        max_words: Upper bound guideline for summary length.
    """

    min_words: int = 30
    max_words: int = 60

    def build_summary_prompt(self, article: Article) -> str:
        """Construct the user-level prompt for a given article."""
        title = article.title.strip()
        content = article.content.strip()

        return f"""Write a very short, engaging summary of the following news article in {self.min_words}-{self.max_words} words (2-3 sentences).

Requirements:
- Let the reader grasp the main idea in a few seconds, without reading the full article.
- Be factual, concise, and easy to scan -- lead with the single most important, concrete fact (not a vague intro).
- Use ONLY information explicitly stated in the article. Never invent or assume facts.
- This is a quick teaser, not a full analysis -- do not try to cover every angle; capture the core idea only.
- Write in clear, plain prose. No bullet points, no markdown, no headings.
- Do not simply repeat the title as the first sentence.
- Output ONLY the summary text itself, with no preamble like "Here is a summary:".

Title: {title}

Article:
\"\"\"
{content}
\"\"\"

Summary:"""

    def build_partial_summary_prompt(
        self, title: str, chunk_text: str, chunk_index: int, total_chunks: int
    ) -> str:
        """Prompt for summarizing a single chunk of a longer article.

        Deliberately asks for a short, self-contained summary of just this
        fragment -- no overall judgment about the whole article, since the
        model only sees one part of it. Kept brief (20-30 words) since the
        final merged summary only needs to be 2-3 sentences total -- there's
        no benefit to verbose intermediate summaries here.
        """
        return f"""This is part {chunk_index}/{total_chunks} of a longer news article. Summarize ONLY this part, factually and concisely, in 20-30 words.

Requirements:
- Use ONLY information explicitly present in this part. Never invent or assume facts.
- Do not refer to "this part" or "this section" in your answer -- just state the facts plainly.
- No bullet points, no markdown, no preamble.

Article title (for context only): {title}

Part {chunk_index}/{total_chunks}:
\"\"\"
{chunk_text}
\"\"\"

Summary of this part:"""

    def build_merge_prompt(self, title: str, partial_summaries: list[str]) -> str:
        """Prompt for merging several partial summaries into one final summary."""
        numbered = "\n".join(
            f"{i + 1}) {summary}" for i, summary in enumerate(partial_summaries)
        )
        return f"""Below are summaries of consecutive parts of the same news article, in order. Merge them into ONE short, engaging summary of {self.min_words}-{self.max_words} words (2-3 sentences).

Requirements:
- Be factual and easy to scan -- lead with the single most important, concrete fact from the parts below.
- Use ONLY information present in the partial summaries below -- never invent or assume facts.
- This is a quick teaser, not a full analysis -- pick the core idea, don't try to fit every detail from every part.
- Remove redundancy between the parts; do not repeat the same fact twice.
- The final summary should read as a single, natural piece of prose -- not a list, not numbered, no reference to "parts" or "sections".
- Do not simply repeat the title as the first sentence.
- Output ONLY the final summary text, with no preamble like "Here is a summary:".

Title: {title}

Partial summaries:
{numbered}

Final summary:"""

    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT


CLASSIFICATION_SYSTEM_PROMPT = (
    "Tu es un système de classification d'articles d'actualité technologique, "
    "spécialisé dans l'intelligence artificielle. Tu réponds TOUJOURS avec "
    "exactement le nom d'une catégorie parmi la liste autorisée, sans "
    "ponctuation, sans phrase, sans explication."
)


@dataclass(frozen=True)
class ClassificationPromptBuilder:
    """Builds prompts for the topic-classification task.

    Kept separate from `PromptBuilder` (summarization) since the two tasks
    have very different output shapes -- one free-form prose, one a single
    constrained label -- even though both eventually go through the same
    `LLMClient`.
    """

    max_content_chars: int = 3000

    def build_classification_prompt(self, article: Article) -> str:
        # Classification only needs enough text to judge the topic, not the
        # full article -- truncating keeps prompts small and fast, which
        # matters especially on memory-constrained machines.
        content = article.content.strip()[: self.max_content_chars]
        return self._build_prompt_for_text(article.title.strip(), content)

    def build_chunk_classification_prompt(
        self, title: str, chunk_text: str, chunk_index: int, total_chunks: int
    ) -> str:
        """Prompt for classifying a single chunk of a longer article.

        Same task, same rules -- just applied to one fragment instead of
        the whole article, so a long article never needs to be sent to the
        model in one large request. The pipeline classifies each chunk and
        takes a majority vote across the results (see
        `llm/classifier.py::ChunkedLLMTopicClassifier`).
        """
        return self._build_prompt_for_text(
            title,
            chunk_text,
            extra_context=f"(Ceci est seulement la partie {chunk_index}/{total_chunks} de l'article.)",
        )

    def _build_prompt_for_text(self, title: str, content: str, extra_context: str = "") -> str:
        categories_block = "\n".join(
            f"- {CATEGORY_DISPLAY_NAMES[cat]}: {CATEGORY_DESCRIPTIONS[cat]}" for cat in Category
        )
        context_note = f"\n{extra_context}\n" if extra_context else ""

        return f"""Classe l'article suivant dans EXACTEMENT une des catégories ci-dessous.
{context_note}
Catégories disponibles :
{categories_block}

Règles :
- Réponds uniquement avec le nom exact de la catégorie (ex: "Startup" ou "Produit IA"), rien d'autre.
- Réponds en français, avec le nom de catégorie tel qu'il apparaît ci-dessus.
- Choisis la catégorie qui correspond le mieux au sujet PRINCIPAL de l'article.
- Si plusieurs catégories semblent possibles, choisis la plus spécifique au contenu réel de l'article.

Titre : {title}

Article :
\"\"\"
{content}
\"\"\"

Catégorie :"""

    @property
    def system_prompt(self) -> str:
        return CLASSIFICATION_SYSTEM_PROMPT


ANALYSIS_SYSTEM_PROMPT = (
    "Tu es un analyste technologique senior qui produit des analyses factuelles, "
    "concises et structurées d'articles sur l'intelligence artificielle, à "
    "destination de décideurs business. Tu ne t'appuies QUE sur les informations "
    "explicitement présentes dans l'article -- tu n'inventes jamais de chiffres, "
    "de faits ou d'entreprises non mentionnés. Si l'article ne donne pas assez "
    "d'éléments pour une section donnée, tu restes honnête et sobre plutôt que "
    "d'extrapoler. Tu réponds TOUJOURS en respectant exactement le format demandé, "
    "avec les libellés de section fournis, sans ajouter de section supplémentaire."
)

# Exact section labels the model must use -- also the contract that
# AnalysisParser (llm/analysis_parser.py) parses against. Keep these two
# files in sync if the format ever changes.
ANALYSIS_SECTION_LABELS = (
    "RESUME_CONCIS",
    "INSIGHT_CLE",
    "IMPACT_BUSINESS",
    "OPPORTUNITES",
    "RISQUES",
    "INDUSTRIES_AFFECTEES",
    "CONCLUSION",
)


@dataclass(frozen=True)
class AnalysisPromptBuilder:
    """Builds prompts for the structured article-analysis task.

    Deliberately asks for labeled plain-text sections rather than raw JSON:
    small local models (llama3.2, qwen2.5:3b) are noticeably less reliable
    at producing syntactically valid JSON than at following a simple
    "LABEL:\\ntext" template, and a malformed JSON response would fail
    100% of the time instead of degrading gracefully section by section.
    """

    max_content_chars: int = 4000

    def build_analysis_prompt(self, article: Article) -> str:
        title = article.title.strip()
        content = article.content.strip()[: self.max_content_chars]

        return f"""Analyse l'article suivant et produis une analyse structurée EXACTEMENT dans le format ci-dessous. Respecte les libellés tels quels, en majuscules, chacun suivi de ":" puis du contenu.

RESUME_CONCIS:
(2 à 3 phrases factuelles résumant l'article)

INSIGHT_CLE:
(1 à 2 phrases : l'enseignement le plus important à retenir)

IMPACT_BUSINESS:
(un court paragraphe sur l'impact business/commercial, basé uniquement sur l'article)

OPPORTUNITES:
- (une opportunité par ligne, commençant par un tiret ; si aucune n'est identifiable, écris "Aucune identifiée")

RISQUES:
- (un risque par ligne, commençant par un tiret ; si aucun n'est identifiable, écris "Aucun identifié")

INDUSTRIES_AFFECTEES:
- (une industrie/secteur par ligne, commençant par un tiret ; si aucune n'est mentionnée, écris "Non précisé")

CONCLUSION:
(1 à 2 phrases de conclusion)

Règles :
- Base-toi UNIQUEMENT sur les informations présentes dans l'article. N'invente rien de précis (pas de chiffres, noms d'entreprises ou citations qui ne sont pas mentionnés).
- L'article ci-dessous peut être court (parfois seulement un extrait plutôt que le texte complet). Fais quand même de ton mieux : remplis TOUTES les sections en te basant sur le titre et le peu de contexte disponible, en restant sobre. N'écris jamais qu'il n'y a "pas assez d'informations" pour RESUME_CONCIS, INSIGHT_CLE ou CONCLUSION -- reformule plutôt ce que le titre et l'extrait permettent raisonnablement de dire.
- Pour OPPORTUNITES, RISQUES et INDUSTRIES_AFFECTEES uniquement, si l'article est trop court pour identifier quoi que ce soit de concret, utilise les libellés prévus ("Aucune identifiée", "Aucun identifié", "Non précisé") plutôt que d'inventer.
- Ne saute aucune section et ne renomme aucun libellé.
- Pas de markdown supplémentaire (pas de **gras**, pas de titres additionnels).

Titre : {title}

Article :
\"\"\"
{content}
\"\"\"

Analyse :"""

    def build_chunk_notes_prompt(
        self, title: str, chunk_text: str, chunk_index: int, total_chunks: int
    ) -> str:
        """Prompt for extracting short factual notes from one chunk of a longer article.

        This is the "map" step of chunked analysis: cheap, short-output
        calls (one per chunk) that digest the article into compact notes,
        which are then fed into two lighter generation calls
        (`build_narrative_sections_prompt` / `build_list_sections_prompt`)
        instead of one large 7-section call over the full raw article.
        """
        return f"""Voici la partie {chunk_index}/{total_chunks} d'un article plus long. Note en 40-60 mots les faits, chiffres, entreprises, opportunités ou risques mentionnés dans CETTE partie uniquement -- pas de mise en forme, juste des observations factuelles condensées.

Ne tire aucune conclusion générale sur l'article entier : tu ne vois que cette partie.

Titre (pour contexte uniquement) : {title}

Partie {chunk_index}/{total_chunks} :
\"\"\"
{chunk_text}
\"\"\"

Notes factuelles de cette partie :"""

    def build_narrative_sections_prompt(self, title: str, digested_notes: str) -> str:
        """Prompt producing only the 4 narrative sections, from pre-digested chunk notes."""
        return f"""Voici des notes factuelles extraites de différentes parties d'un même article. Produis les sections suivantes, EXACTEMENT dans ce format.

RESUME_CONCIS:
(2 à 3 phrases factuelles résumant l'article)

INSIGHT_CLE:
(1 à 2 phrases : l'enseignement le plus important à retenir)

IMPACT_BUSINESS:
(un court paragraphe sur l'impact business/commercial)

CONCLUSION:
(1 à 2 phrases de conclusion)

Règles :
- Base-toi UNIQUEMENT sur les notes ci-dessous. N'invente rien qui n'y figure pas.
- Ne saute aucune section et ne renomme aucun libellé. Pas de markdown supplémentaire.

Titre : {title}

Notes factuelles (issues de plusieurs parties de l'article) :
{digested_notes}

Analyse :"""

    def build_list_sections_prompt(self, title: str, digested_notes: str) -> str:
        """Prompt producing only the 3 list sections, from pre-digested chunk notes."""
        return f"""Voici des notes factuelles extraites de différentes parties d'un même article. Produis les sections suivantes, EXACTEMENT dans ce format.

OPPORTUNITES:
- (une opportunité par ligne, commençant par un tiret ; si aucune n'est identifiable, écris "Aucune identifiée")

RISQUES:
- (un risque par ligne, commençant par un tiret ; si aucun n'est identifiable, écris "Aucun identifié")

INDUSTRIES_AFFECTEES:
- (une industrie/secteur par ligne, commençant par un tiret ; si aucune n'est mentionnée, écris "Non précisé")

Règles :
- Base-toi UNIQUEMENT sur les notes ci-dessous. N'invente rien qui n'y figure pas.
- Ne saute aucune section et ne renomme aucun libellé. Pas de markdown supplémentaire.

Titre : {title}

Notes factuelles (issues de plusieurs parties de l'article) :
{digested_notes}

Analyse :"""

    @property
    def system_prompt(self) -> str:
        return ANALYSIS_SYSTEM_PROMPT
