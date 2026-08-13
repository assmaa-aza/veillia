"""Validation logic for predicted categories.

Small on purpose: the heavy lifting (matching free-form model output to a
known Category) already happens in `Category.from_text`. This validator is
the final quality gate before persisting -- currently just confirms the
predicted category is a genuinely recognized one, but kept as its own class
so stricter rules (e.g. confidence thresholds, per-category heuristics) can
be added later without touching the pipeline.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from models.category import Category


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    reason: str = ""


class ClassificationValidatorInterface(ABC):
    @abstractmethod
    def validate(self, category: Category) -> ValidationResult:
        raise NotImplementedError


class ClassificationValidator(ClassificationValidatorInterface):
    """Confirms a predicted category is one of the known, allowed values."""

    def validate(self, category: Category) -> ValidationResult:
        if category is None or category not in Category:
            return ValidationResult(False, f"Unrecognized category: {category!r}")
        return ValidationResult(True)
