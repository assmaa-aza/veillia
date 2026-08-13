"""Prompt construction for the Article AI Chat assistant.

Kept as its own module (like `llm/prompts.py`'s other builders) so the
grounding rules and context formatting can evolve independently of the API
layer and the LLM client.
"""
from __future__ import annotations

from dataclasses import dataclass

from models.analysis import ArticleAnalysis
from models.article import Article
from models.chat import ChatTurn

CHAT_SYSTEM_PROMPT_TEMPLATE = """Tu es l'assistant IA de VeillIA, intégré à la page d'un article. Ton rôle est d'aider l'utilisateur à mieux comprendre CET article précis.

Tu peux :
- Répondre à des questions sur l'article.
- Expliquer des mots techniques, acronymes ou concepts mentionnés dans l'article.
- Reformuler ou simplifier des passages complexes.
- Résumer une partie précise de l'article à la demande.
- Approfondir un sujet évoqué dans l'article.
- Expliquer les implications, opportunités, risques et technologies connexes mentionnés dans l'article.

Règles strictes :
- Pour tout ce qui concerne les FAITS de l'article (ce qui s'est passé, qui est impliqué, chiffres, dates, décisions, résultats, entreprises citées), base-toi UNIQUEMENT sur le contexte fourni ci-dessous. N'invente RIEN qui n'y figure pas.
- Si la question porte sur une information qui n'est pas présente dans le contexte fourni, réponds clairement que cette information n'est pas disponible dans l'article actuel -- ne devine pas, n'extrapole pas.
- Exception pour la pédagogie : tu peux utiliser tes connaissances générales UNIQUEMENT pour expliquer/définir un terme technique, un acronyme ou un concept qui apparaît dans l'article (ex: "qu'est-ce que le fine-tuning ?"). C'est une clarification pédagogique, pas une affirmation sur les faits de l'article -- ne t'en sers jamais pour ajouter des faits sur le sujet spécifique de l'article.
- Réponds de façon claire, concise et pédagogique, adaptée à quelqu'un qui découvre le sujet.
- Réponds en texte naturel, comme dans une conversation -- pas de JSON, pas de format structuré, sauf si l'utilisateur le demande explicitement.

Contexte de l'article (à utiliser comme unique source de vérité pour les faits) :

{context_block}"""


@dataclass(frozen=True)
class ArticleChatPromptBuilder:
    """Builds the system prompt (grounding rules + article context) and
    trims conversation history for the chat assistant.

    Attributes:
        max_content_chars: caps how much raw article content goes into the
            context when NO stored analysis exists yet, to keep prompts
            fast.
        max_content_chars_with_analysis: a much smaller cap used when a
            stored `analysis` IS available. The structured analysis already
            distills the article's facts, opportunities, risks, etc., so
            most of what the raw content would add is redundant -- sending
            the full excerpt anyway would just make every chat request
            larger (and slower/more RAM-hungry) for no real benefit. This
            is the same "keep single requests small" principle used by the
            chunked summarizer/classifier/analyzer, applied to chat's
            per-request context instead of a multi-call split.
        max_history_turns: caps how many prior turns are replayed to the
            model each request, so a long conversation doesn't keep growing
            the prompt (and therefore latency) without bound.
    """

    max_content_chars: int = 3000
    max_content_chars_with_analysis: int = 800
    max_history_turns: int = 12

    def build_system_prompt(self, article: Article, analysis: ArticleAnalysis | None) -> str:
        context_block = self._build_context_block(article, analysis)
        return CHAT_SYSTEM_PROMPT_TEMPLATE.format(context_block=context_block)

    def build_messages(self, conversation_history: list[ChatTurn], new_message: str) -> list[ChatTurn]:
        """Return the trimmed conversation, with the new user message appended."""
        trimmed = conversation_history[-self.max_history_turns :] if conversation_history else []
        return [*trimmed, ChatTurn(role="user", content=new_message.strip())]

    def _build_context_block(self, article: Article, analysis: ArticleAnalysis | None) -> str:
        title = article.title.strip()
        content_budget = (
            self.max_content_chars_with_analysis if analysis is not None else self.max_content_chars
        )
        content = article.content.strip()[:content_budget]

        parts = [f"TITRE : {title}"]

        if article.summary:
            parts.append(f"\nRÉSUMÉ RAPIDE :\n{article.summary.strip()}")

        if content:
            label = (
                "EXTRAIT DE L'ARTICLE (complément à l'analyse ci-dessous)"
                if analysis is not None
                else "CONTENU DE L'ARTICLE"
            )
            parts.append(f'\n{label} :\n"""\n{content}\n"""')
        else:
            parts.append("\nCONTENU DE L'ARTICLE : (non disponible)")

        if analysis is not None:
            parts.append(self._format_analysis_block(analysis))
        else:
            parts.append(
                "\nANALYSE STRUCTURÉE : aucune analyse n'a encore été générée pour cet article."
            )

        return "\n".join(parts)

    @staticmethod
    def _format_analysis_block(analysis: ArticleAnalysis) -> str:
        def list_or_none(items: list[str]) -> str:
            return ", ".join(items) if items else "Aucun(e)"

        return (
            "\nANALYSE STRUCTURÉE DÉJÀ GÉNÉRÉE POUR CET ARTICLE :\n"
            f"- Résumé concis : {analysis.concise_summary}\n"
            f"- Insight clé : {analysis.key_insight}\n"
            f"- Impact business : {analysis.business_impact}\n"
            f"- Opportunités : {list_or_none(analysis.opportunities)}\n"
            f"- Risques : {list_or_none(analysis.risks)}\n"
            f"- Industries concernées : {list_or_none(analysis.affected_industries)}\n"
            f"- Conclusion : {analysis.conclusion}"
        )
