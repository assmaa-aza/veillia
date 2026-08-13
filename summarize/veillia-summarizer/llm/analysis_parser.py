"""Parses the LLM's labeled-section analysis output into an ArticleAnalysis.

Kept as its own class (Single Responsibility), separate from the code that
calls the LLM, so the parsing logic can be unit-tested with plain strings --
no LLM, no network, no mocking required.
"""
from __future__ import annotations

import re

from llm.prompts import ANALYSIS_SECTION_LABELS
from models.analysis import ArticleAnalysis

# Maps the exact section labels used in the prompt to ArticleAnalysis field
# names. Kept in one place so a label change only needs updating here (and
# in the prompt itself).
_LABEL_TO_FIELD = {
    "RESUME_CONCIS": "concise_summary",
    "INSIGHT_CLE": "key_insight",
    "IMPACT_BUSINESS": "business_impact",
    "OPPORTUNITES": "opportunities",
    "RISQUES": "risks",
    "INDUSTRIES_AFFECTEES": "affected_industries",
    "CONCLUSION": "conclusion",
}

_LIST_FIELDS = {"opportunities", "risks", "affected_industries"}

# Phrases the prompt explicitly allows as "nothing to report" -- these are
# normalized to an empty list rather than kept as a literal placeholder
# string, since an empty list is more useful to downstream consumers.
_EMPTY_LIST_MARKERS = {
    "aucune identifiée", "aucun identifié", "non précisé",
    "aucune", "aucun", "n/a", "none",
}

_BULLET_PREFIX_RE = re.compile(r"^\s*[-*•]\s*")


class AnalysisParseError(ValueError):
    """Raised when the LLM output is too malformed to extract a usable analysis."""


class AnalysisParser:
    """Turns raw LLM text (labeled sections) into a structured ArticleAnalysis."""

    def parse(self, raw_text: str) -> ArticleAnalysis:
        sections = self._split_sections(raw_text)

        missing_critical = [
            label for label in ("RESUME_CONCIS", "INSIGHT_CLE", "CONCLUSION")
            if not sections.get(label, "").strip()
        ]
        if missing_critical:
            raise AnalysisParseError(
                f"Missing or empty required section(s): {', '.join(missing_critical)}"
            )

        fields: dict[str, object] = {}
        for label, field_name in _LABEL_TO_FIELD.items():
            raw_value = sections.get(label, "").strip()
            if field_name in _LIST_FIELDS:
                fields[field_name] = self._parse_list(raw_value)
            else:
                fields[field_name] = raw_value

        return ArticleAnalysis(**fields)

    def parse_narrative_sections(self, raw_text: str) -> dict:
        """Parse a response containing only RESUME_CONCIS/INSIGHT_CLE/IMPACT_BUSINESS/CONCLUSION.

        Used by the chunked analysis flow (`llm/analyzer.py::ChunkedLLMArticleAnalyzer`),
        which asks for the narrative sections and the list sections in two
        separate, lighter calls rather than one large 7-section call.
        """
        sections = self._split_sections(raw_text)
        missing_critical = [
            label for label in ("RESUME_CONCIS", "INSIGHT_CLE", "CONCLUSION")
            if not sections.get(label, "").strip()
        ]
        if missing_critical:
            raise AnalysisParseError(
                f"Missing or empty required section(s): {', '.join(missing_critical)}"
            )
        return {
            "concise_summary": sections.get("RESUME_CONCIS", "").strip(),
            "key_insight": sections.get("INSIGHT_CLE", "").strip(),
            "business_impact": sections.get("IMPACT_BUSINESS", "").strip(),
            "conclusion": sections.get("CONCLUSION", "").strip(),
        }

    def parse_list_sections(self, raw_text: str) -> dict:
        """Parse a response containing only OPPORTUNITES/RISQUES/INDUSTRIES_AFFECTEES."""
        sections = self._split_sections(raw_text)
        return {
            "opportunities": self._parse_list(sections.get("OPPORTUNITES", "").strip()),
            "risks": self._parse_list(sections.get("RISQUES", "").strip()),
            "affected_industries": self._parse_list(sections.get("INDUSTRIES_AFFECTEES", "").strip()),
        }

    @staticmethod
    def _split_sections(raw_text: str) -> dict[str, str]:
        """Split raw text into {LABEL: content} using the known labels as anchors."""
        # Build a regex that finds any known label followed by ":" at the
        # start of a line, so we can slice the text between consecutive
        # labels regardless of the order the model actually produced them.
        label_pattern = "|".join(re.escape(label) for label in ANALYSIS_SECTION_LABELS)
        pattern = re.compile(rf"(?:^|\n)\s*({label_pattern})\s*:\s*", re.IGNORECASE)

        matches = list(pattern.finditer(raw_text))
        sections: dict[str, str] = {}
        for i, match in enumerate(matches):
            label = match.group(1).upper()
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
            sections[label] = raw_text[start:end].strip()
        return sections

    @staticmethod
    def _parse_list(raw_value: str) -> list[str]:
        if not raw_value:
            return []
        if raw_value.strip().lower().rstrip(".") in _EMPTY_LIST_MARKERS:
            return []

        items = []
        for line in raw_value.splitlines():
            line = _BULLET_PREFIX_RE.sub("", line).strip()
            if not line:
                continue
            if line.lower().rstrip(".") in _EMPTY_LIST_MARKERS:
                continue
            items.append(line)

        # Fallback: model ignored the "one per line" instruction and wrote
        # a single comma-separated line instead (no bullets, so the loop
        # above collapsed it into one "item" containing commas).
        if len(items) == 1 and "," in items[0]:
            items = [part.strip() for part in items[0].split(",") if part.strip()]
        elif not items and "," in raw_value:
            items = [part.strip() for part in raw_value.split(",") if part.strip()]

        return items
