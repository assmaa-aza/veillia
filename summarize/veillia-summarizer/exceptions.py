"""Custom exception hierarchy for VeillIA Summarizer.

Using a dedicated hierarchy (rather than raising bare Exceptions or letting
third-party exceptions leak through) keeps error handling predictable across
the whole pipeline and makes it easy for calling code (e.g. main.py, or the
future VeillIA orchestrator) to catch exactly what it cares about.
"""


class VeillIAError(Exception):
    """Base exception for all VeillIA Summarizer errors."""


class ConfigurationError(VeillIAError):
    """Raised when required configuration is missing or invalid."""


class DatabaseError(VeillIAError):
    """Raised when a database (Supabase) operation fails."""


class LLMError(VeillIAError):
    """Raised when the LLM backend fails to generate a response."""


class SummarizationError(VeillIAError):
    """Raised when the summarization step fails end-to-end."""


class ClassificationError(VeillIAError):
    """Raised when the topic classification step fails end-to-end."""


class AnalysisError(VeillIAError):
    """Raised when the structured article analysis step fails end-to-end."""


class ChatError(VeillIAError):
    """Raised when the article chat assistant fails to produce a reply."""


class ValidationError(VeillIAError):
    """Raised when a generated summary fails validation checks."""
