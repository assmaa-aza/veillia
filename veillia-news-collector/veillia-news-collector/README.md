# VeillIA News Collector

A modular, extensible Python pipeline that collects AI news from multiple
trusted sources, normalizes every article into a common schema, and stores
the result in **Supabase**.

```
Collector → Normalize → Supabase
```

This is the **first building block of VeillIA**: a standalone collection
pipeline that will become VeillIA's first AI microservice. There is
intentionally **no web interface** at this stage — the goal is a clean,
testable collection → normalization → storage pipeline.

---

## Features

- **Modular collector architecture** — every source implements the same
  `BaseCollector` interface, so adding a new source never touches existing
  code.
- **RSS-first**, with a documented, best-effort HTML-scraping fallback for
  sources without a public feed (Anthropic).
- **Full-article content fetching** — RSS feeds usually only expose a short
  excerpt, so each collector visits the article's actual page and extracts
  the real body text with `trafilatura` (toggle: `FETCH_FULL_CONTENT`).
- **Common `Article` schema** for every source, regardless of how the raw
  data arrived.
- **URL-based deduplication** — both in-memory before storage, and at the
  database level via an upsert keyed on `url` (re-running the pipeline
  never creates duplicate rows).
- **Graceful error handling** — a single broken/unreachable source never
  crashes the run; it's logged and skipped.
- **Pluggable storage layer** — `storage/supabase_storage.py` is the
  default backend; a local JSON backend (`storage/json_storage.py`) is
  also included for quick offline testing (`STORAGE_BACKEND=json`). Both
  implement the same `BaseStorage` interface, so no collector ever needs
  to know which one is active.
- **Terminal summary** after every run: sources processed, articles
  collected, duplicates removed, processing time.

## Project structure

```
veillia-news-collector/
│
├── collectors/          # One file per source, all implementing BaseCollector
│   ├── base.py           # Abstract BaseCollector + shared RSSCollector logic
│   ├── openai.py
│   ├── anthropic.py      # HTML fallback (no public RSS feed available)
│   ├── google_ai.py
│   ├── huggingface.py
│   └── techcrunch.py
│
├── models/
│   └── article.py        # The canonical Article dataclass (the shared schema)
│
├── storage/
│   ├── base.py              # Abstract storage interface (BaseStorage)
│   ├── supabase_storage.py  # Default backend — writes to Supabase
│   ├── schema.sql           # Run once in Supabase SQL Editor to create the table
│   └── json_storage.py      # Local JSON fallback (STORAGE_BACKEND=json)
│
├── utils/
│   ├── parser.py          # Date parsing, image extraction helpers
│   ├── cleaner.py          # HTML stripping, whitespace/tag normalization
│   └── logger.py           # Centralized logging setup
│
├── output/
│   └── articles.json      # Only written when STORAGE_BACKEND=json
│
├── config.py              # Source registry + all tunable settings
├── main.py                # Pipeline orchestrator / entry point
├── requirements.txt
├── .env.example
└── README.md
```

## Sources

| Source                    | Method | Feed / page URL |
|---------------------------|--------|------------------|
| OpenAI                    | RSS    | `https://openai.com/news/rss.xml` |
| Anthropic                 | HTML*  | `https://www.anthropic.com/news` |
| Google AI                 | RSS    | `https://blog.google/technology/ai/rss/` |
| Hugging Face              | RSS    | `https://huggingface.co/blog/feed.xml` |
| TechCrunch AI             | RSS    | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| The Verge AI              | RSS    | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| MIT Technology Review AI  | RSS    | `https://www.technologyreview.com/topic/artificial-intelligence/feed/` |
| MarkTechPost              | RSS    | `https://www.marktechpost.com/feed/` |
| Ars Technica AI           | RSS    | `https://arstechnica.com/ai/feed/` |
| arXiv cs.AI               | RSS**  | `https://rss.arxiv.org/rss/cs.AI` |

\* Anthropic does not currently publish a public RSS feed for its news page,
so `AnthropicCollector` parses the public newsroom page directly instead. It
still implements the exact same `BaseCollector` interface as every RSS
source, and is written defensively: if Anthropic changes their page layout,
it logs a warning and returns whatever it could parse rather than crashing.
If Anthropic ever ships an RSS feed, swap this collector for an
`RSSCollector` subclass (see `collectors/openai.py` for the ~5-line pattern)
— nothing else in the project needs to change.

\*\* arXiv cs.AI is a very high-volume research feed (often dozens of papers
a day), so its `config.SOURCES` entry sets `"max_articles": 10` to cap it
tighter than the other sources — see "Per-source article limits" below.
`ArxivCollector` also strips the trailing `(arXiv:2401.01234v1 [cs.AI])`
identifier suffix that arXiv appends to every title.

### Per-source article limits

Any entry in `config.SOURCES` can set an optional `"max_articles"` key to
override the global `MAX_ARTICLES_PER_SOURCE` just for that source:

```python
{
    "name": "arXiv cs.AI",
    "type": "rss",
    "url": "https://rss.arxiv.org/rss/cs.AI",
    "max_articles": 10,
},
```

Useful for high-volume feeds that would otherwise crowd out slower-moving
sources in a single run. Sources without this key fall back to the global
default.

## The `Article` schema

Every collector, regardless of source or method, returns a list of
`Article` objects with this exact shape:

```json
{
  "title": "New OpenAI Model Released",
  "url": "https://openai.com/news/...",
  "source": "OpenAI",
  "author": null,
  "published_at": "2026-07-09T10:00:00+00:00",
  "summary": "A short excerpt of the article...",
  "content": "The fullest available body text...",
  "image_url": "https://.../cover.jpg",
  "language": "en",
  "tags": ["Product"],
  "collected_at": "2026-07-12T22:47:03.394567+00:00"
}
```

Any field the source doesn't provide is stored as `null` (`None` in
Python) — never omitted, so downstream consumers can always rely on the
full schema being present.

## Full-article content fetching

RSS feeds almost never contain the full article — most publishers
deliberately truncate their feed's description to a short excerpt to
drive traffic to their own site. So without extra work, `content` would
often be no richer than `summary`.

To fix this, every collector visits the article's actual page (one extra
HTTP request per article) and extracts the real body text with
[`trafilatura`](https://github.com/adbar/trafilatura) — a library
purpose-built for pulling out just the article body while discarding
navigation, headers, footers, related-article widgets, and comment
sections. See `utils/full_text.py`.

- **RSS sources** (`RSSCollector`): `content` is replaced with the
  fetched full text when available; `summary` always stays as the
  feed's own short excerpt.
- **Anthropic**: this is what fills in `content` and `image_url` at
  all — the news index page has neither, only title/date/category.
  Content and image are extracted together from a single fetch of each
  article's page (not two separate requests).

**Trade-offs, on purpose:**
- This is controlled by `FETCH_FULL_CONTENT` in `.env` (default `true`).
  Set it to `false` to skip the extra requests entirely and rely on
  feed-provided content only — useful for a quick pipeline smoke test,
  since it's noticeably faster.
- `FULL_CONTENT_MAX_CHARS` (default `20000`) caps how much text is kept
  per article, to avoid an unusually long page bloating storage.
- A few sites may rate-limit or block scraping of individual article
  pages even when their RSS feed itself is freely accessible. Failures
  here are handled the same way as everywhere else in the pipeline —
  logged and skipped, falling back to whatever content the feed already
  provided, never a crash.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) if you don't
   already have one.
2. Open **SQL Editor** in the Supabase dashboard, paste the contents of
   `storage/schema.sql`, and run it. This creates the `articles` table
   with a `UNIQUE` constraint on `url` — the constraint is what makes
   re-running the pipeline safely upsert instead of duplicating rows.
3. Go to **Settings → API** and copy your **Project URL** and either the
   **service_role** key (recommended for this trusted, server-side
   pipeline) or the **anon** key (if you configure Row Level Security
   policies that permit inserts/upserts).
4. Put those values in your `.env` file (see Installation below).

## Installation

Requires **Python 3.12+**.

```bash
git clone <this-repo>
cd veillia-news-collector

python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
```

Edit `.env` and set:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
```

## Running the collector

```bash
python main.py
```

Example output:

```
2026-07-12 10:00:00 | INFO | __main__ | Starting VeillIA news collection run...
2026-07-12 10:00:00 | INFO | __main__ | Using Supabase storage backend (table: 'articles')
2026-07-12 10:00:01 | INFO | collectors.base | OpenAI: collected 15 article(s)
2026-07-12 10:00:02 | INFO | collectors.anthropic | Anthropic: collected 10 article(s)
2026-07-12 10:00:03 | INFO | collectors.base | Google AI: collected 12 article(s)
2026-07-12 10:00:04 | INFO | collectors.base | Hugging Face: collected 20 article(s)
2026-07-12 10:00:05 | INFO | collectors.base | TechCrunch AI: collected 20 article(s)
2026-07-12 10:00:06 | INFO | storage.supabase_storage | Upserted 74 article(s) into Supabase table 'articles'

==================================================
VeillIA News Collector -- Run Summary
==================================================
Sources processed     : 5
  - succeeded          : 5
  - failed              : 0
Articles collected     : 74
Duplicates removed     : 3
Processing time        : 4.82s
==================================================
```

If `SUPABASE_URL`/`SUPABASE_KEY` are missing or invalid, the pipeline
fails fast with a clear message *before* running any collectors, instead
of wasting a network round-trip on every source only to discover at the
end there's nowhere to store the results.

> **Network note:** if you run this from an environment with restricted
> outbound internet access (some sandboxes, CI runners, corporate
> proxies), requests to the source domains may be blocked. Each collector
> handles this gracefully — it logs the failure and the pipeline still
> completes with 0 articles from that source — but you'll want to run it
> from an environment with normal internet access to actually collect
> real articles.

### Testing locally without Supabase

Set `STORAGE_BACKEND=json` in `.env` (or as an environment variable) to
write to `output/articles.json` instead — useful for a quick pipeline
smoke test without a Supabase project on hand:

```bash
STORAGE_BACKEND=json python main.py
```

For an even faster smoke test, also skip full-content fetching:

```bash
STORAGE_BACKEND=json FETCH_FULL_CONTENT=false python main.py
```

## Configuration

All tunables live in `config.py` and can be overridden via `.env`
(see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `STORAGE_BACKEND` | `supabase` | `supabase` or `json` |
| `SUPABASE_URL` | *(required for supabase backend)* | Supabase project URL |
| `SUPABASE_KEY` | *(required for supabase backend)* | Supabase API key |
| `SUPABASE_TABLE` | `articles` | Table the pipeline writes to |
| `OUTPUT_FILENAME` | `articles.json` | Used only when `STORAGE_BACKEND=json` |
| `REQUEST_TIMEOUT_SECONDS` | `15` | HTTP timeout per request |
| `USER_AGENT` | *(descriptive default)* | Sent with every HTTP request |
| `MAX_ARTICLES_PER_SOURCE` | `20` | Cap on articles pulled per source, per run |
| `FETCH_FULL_CONTENT` | `true` | Visit each article's page for full body text (see above) |
| `FULL_CONTENT_MAX_CHARS` | `20000` | Cap on extracted article length; `0` disables |

## Adding a new source

1. Add an entry to `config.SOURCES` in `config.py`:
   ```python
   {"name": "DeepMind", "type": "rss", "url": "https://deepmind.google/blog/rss.xml"}
   ```
2. Create `collectors/deepmind.py`:
   ```python
   from collectors.base import RSSCollector

   class DeepMindCollector(RSSCollector):
       source_name = "DeepMind"
   ```
3. Register it in `main.py`'s `COLLECTOR_REGISTRY`:
   ```python
   "DeepMind": DeepMindCollector,
   ```

That's it — deduplication, storage, and the summary report all work
automatically for the new source. If the new source has no RSS feed,
subclass `BaseCollector` directly instead (see `collectors/anthropic.py`
for a full example of a non-RSS collector).

## Testing the pipeline logic without network access

Every layer is written as small, pure, testable units. For example, to
verify RSS entry parsing without hitting the network:

```python
import feedparser
from collectors.openai import OpenAICollector

feed = feedparser.parse("<rss>...</rss>")  # or a local .xml file
collector = OpenAICollector(url="unused")
for entry in feed.entries:
    article = collector._entry_to_article(entry)
    print(article.to_dict())
```

## Roadmap / future compatibility

Storage now lives in Supabase, but the architecture is shaped for what
comes next:

- **New sources**: DeepMind, Meta AI, Mistral, arXiv cs.AI, etc. — same
  three-step process described above.
- **AI processing modules** (summarization, topic tagging, relevance
  scoring): can be added as a new pipeline stage between collection and
  storage, operating on the same `Article` objects before `storage.save()`
  is called.
- **Row Level Security / multi-tenant access**: `storage/schema.sql` ships
  with RLS commented out; enable it and add policies once the VeillIA
  backend needs scoped read access.
- **A third storage backend** (e.g. a different database, a message
  queue): implement `BaseStorage`, add a branch in `main.py`'s
  `build_storage()` — no collector changes needed, same as the JSON →
  Supabase swap required none.
- **Scheduling / microservice**: `run_pipeline()` in `main.py` is already
  decoupled from the CLI entry point (`main()`), so it can be called from
  a cron job, a task queue, or an HTTP endpoint without modification.

## License

Internal VeillIA project component.
