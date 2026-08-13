"""
utils/logger.py
----------------
Centralized logging configuration for the whole application.

Every module should obtain its logger via `get_logger(__name__)` instead
of calling `logging.getLogger` directly or using `print()`. This keeps
log formatting consistent and makes it trivial to redirect logs to a
file, a log aggregator, or the future VeillIA observability stack
without touching business logic.
"""

from __future__ import annotations

import logging
import sys

_CONFIGURED = False


def _configure_root_logger(level: int = logging.INFO) -> None:
    """Configure the root logger exactly once for the whole process."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(handler)

    _CONFIGURED = True


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a configured logger for the given module name.

    Args:
        name: Typically `__name__` of the calling module.
        level: Logging level for the root logger (only applied once).

    Returns:
        A ready-to-use `logging.Logger` instance.
    """
    _configure_root_logger(level)
    return logging.getLogger(name)
