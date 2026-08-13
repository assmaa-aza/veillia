"""
config.py
---------
Centralized configuration for the VeillIA news-collector.

All tunable parameters (source list, HTTP timeouts, output paths, ...)
live here so that:
  - collectors stay free of hardcoded values,
  - environment-specific overrides (via `.env`) are applied in one place,
  - adding a new source later means editing a single dictionary here
    plus adding a new collector class -- nothing else changes.

Environment variables are loaded from a `.env` file (see `.env.example`)
using python-dotenv. RSS feeds themselves are public, but storage now
requires Supabase credentials -- see the "Storage backend" section below.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load variables from a local .env file, if present. Safe no-op if missing.
load_dotenv()

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"

# --------------------------------------------------------------------------
# HTTP behaviour
# --------------------------------------------------------------------------
REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "15"))
USER_AGENT = os.getenv(
    "USER_AGENT",
    "VeillIA-NewsCollector/0.1 (+https://veillia.example.com; contact: dev@veillia.example.com)",
)

# Maximum number of articles pulled per source, per run. Keeps the
# pipeline fast and predictable during testing; raise for production.
MAX_ARTICLES_PER_SOURCE = int(os.getenv("MAX_ARTICLES_PER_SOURCE", "20"))

# --------------------------------------------------------------------------
# Full-content fetching
# --------------------------------------------------------------------------
# RSS feeds almost never contain the full article -- most publishers only
# expose a short excerpt to drive traffic to their own site. When enabled,
# each collector visits the article's actual URL and extracts the real
# body text (via utils/full_text.py, using `trafilatura`), instead of
# relying on whatever partial text the feed happened to include.
#
# This costs one extra HTTP request per article, so a full run is
# meaningfully slower with this on. Set FETCH_FULL_CONTENT=false in .env
# to skip it (e.g. for a quick pipeline smoke test) and fall back to
# feed-provided content only.
FETCH_FULL_CONTENT = os.getenv("FETCH_FULL_CONTENT", "true").lower() in ("1", "true", "yes")

# Safety cap on extracted article length (characters). Prevents an
# unusually long page from bloating storage. Set to 0 to disable.
FULL_CONTENT_MAX_CHARS = int(os.getenv("FULL_CONTENT_MAX_CHARS", "20000"))

# --------------------------------------------------------------------------
# Storage backend
# --------------------------------------------------------------------------
# The pipeline persists to Supabase by default:
#
#     Collector -> Normalize (Article) -> Supabase
#
# `STORAGE_BACKEND` can be set to "json" in `.env` to fall back to the
# local JSON file instead -- handy for quick local testing without a
# Supabase project on hand. See storage/base.py for the shared interface
# that makes this swap possible without touching any collector.
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "supabase").lower()

# Supabase project credentials. Required when STORAGE_BACKEND=supabase.
# Find these in your Supabase project: Settings -> API.
#   - SUPABASE_URL: the "Project URL" (e.g. https://xxxx.supabase.co)
#   - SUPABASE_KEY: the "service_role" key for a trusted server-side
#     pipeline like this one (or the "anon" key if you've set up Row
#     Level Security policies that permit inserts/upserts).
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "articles")

# Local JSON fallback (used only when STORAGE_BACKEND=json).
OUTPUT_FILE = OUTPUT_DIR / os.getenv("OUTPUT_FILENAME", "articles.json")

# --------------------------------------------------------------------------
# Sources registry
# --------------------------------------------------------------------------
# Each entry describes a source that will be turned into a collector
# instance by `main.py` / a collector factory. Adding a new RSS-based
# source only requires a new dictionary entry here PLUS a matching
# collector class -- no other file needs to change.
#
# An entry may optionally set "max_articles" to override
# MAX_ARTICLES_PER_SOURCE just for that source -- useful for very
# high-volume feeds (e.g. arXiv, which can publish dozens of papers a
# day) that would otherwise crowd out every other source in a single run.
#
# NOTE on Anthropic: as of this writing, Anthropic does not publish a
# public RSS feed for its news page. The AnthropicCollector therefore
# falls back to lightweight HTML parsing of the public news page instead
# of feed parsing, while still implementing the same BaseCollector
# interface as every other source. If Anthropic publishes an RSS feed in
# the future, only `collectors/anthropic.py` needs to change.
SOURCES = [
    {
        "name": "OpenAI",
        "type": "rss",
        "url": "https://openai.com/news/rss.xml",
    },
    {
        "name": "Anthropic",
        "type": "html",
        "url": "https://www.anthropic.com/news",
    },
    {
        "name": "Google AI",
        "type": "rss",
        "url": "https://blog.google/technology/ai/rss/",
    },
    {
        "name": "Hugging Face",
        "type": "rss",
        "url": "https://huggingface.co/blog/feed.xml",
    },
    {
        "name": "TechCrunch AI",
        "type": "rss",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
    },
    {
        "name": "The Verge AI",
        "type": "rss",
        "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    },
    {
        "name": "MIT Technology Review AI",
        "type": "rss",
        "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    },
    {
        "name": "MarkTechPost",
        "type": "rss",
        "url": "https://www.marktechpost.com/feed/",
    },
    {
        "name": "Ars Technica AI",
        "type": "rss",
        "url": "https://arstechnica.com/ai/feed/",
    },
    {
        "name": "arXiv cs.AI",
        "type": "rss",
        "url": "https://rss.arxiv.org/rss/cs.AI",
        # Very high-volume research feed -- capped tighter than the
        # MAX_ARTICLES_PER_SOURCE default so it doesn't dominate a run.
        "max_articles": 10,
    },
]
