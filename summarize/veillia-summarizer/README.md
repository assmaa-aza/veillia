# VeillIA AI Summarizer

A standalone, 100% free, local-LLM-powered microservice that reads unsummarized
articles from a Supabase `articles` table, generates concise factual summaries
with a local Ollama model (Llama 3.2, Qwen 2.5, Mistral, etc.), validates them,
and writes them back to the database — no OpenAI, no Claude, no Gemini, no paid
API of any kind.

It is built as **Stage 2** of the VeillIA pipeline, designed to run on its own
and later be dropped into the main VeillIA platform as the AI Summarization
Service.

```
Supabase → Load Unsummarized Articles → Prepare Prompt → Local LLM (Ollama)
         → Generate Summary → Validate Summary → Update Database
```

---

## 1. Architecture

The project follows **Clean Architecture** / **SOLID** principles: every
concrete implementation (Supabase, Ollama) sits behind an abstract interface,
so any of them can be swapped without touching the pipeline logic.

```
veillia-summarizer/
│
├── llm/
│   ├── base.py             # LLMClient interface (extension point for new models)
│   ├── ollama_client.py    # Ollama implementation of LLMClient (generate() + chat())
│   ├── prompts.py          # PromptBuilder + ClassificationPromptBuilder + AnalysisPromptBuilder
│   ├── chat_prompt.py      # ArticleChatPromptBuilder -- grounding rules + context for chat
│   ├── text_chunker.py     # TextChunker -- splits long text on whitespace boundaries
│   ├── summarizer.py       # Summarizer interface + LLMSummarizer + ChunkedLLMSummarizer
│   ├── classifier.py       # TopicClassifier interface + LLMTopicClassifier + ChunkedLLMTopicClassifier
│   ├── analyzer.py         # ArticleAnalyzer interface + LLMArticleAnalyzer + ChunkedLLMArticleAnalyzer
│   ├── analysis_parser.py  # AnalysisParser -- labeled-section text -> ArticleAnalysis
│   └── article_chat.py     # ArticleChatAssistant interface + LLMArticleChatAssistant
│
├── api/
│   ├── app.py               # FastAPI app + the /articles/{id}/chat route
│   ├── dependencies.py      # Singleton composition root for the API (low-latency reuse)
│   └── schemas.py           # Pydantic request/response models for the chat endpoint
│
├── database/
│   ├── base.py              # Repository interfaces (one per concern -- summary/category/analysis/content/lookup)
│   └── supabase.py          # Supabase implementation of all of them
│
├── models/
│   ├── article.py           # Article, SummaryResult, ClassificationResult
│   ├── category.py          # Category enum (7 categories, incl. produit_ia) + language-independent matching
│   ├── analysis.py          # ArticleAnalysis, AnalysisResult
│   └── chat.py               # ChatTurn (role + content)
│
├── services/
│   ├── pipeline.py                  # SummarizationPipeline
│   ├── validator.py                 # SummaryValidator
│   ├── classification_pipeline.py   # ClassificationPipeline
│   ├── classification_validator.py  # ClassificationValidator
│   ├── analysis_pipeline.py         # AnalysisPipeline
│   ├── analysis_validator.py        # AnalysisValidator
│   └── content_fetcher.py           # Fetches full page content when only a short teaser is stored
│
├── migrations/
│   ├── 001_add_category_column.sql       # Adds the `category` column + constraint
│   ├── 002_add_produit_ia_category.sql   # Adds the 7th category to the constraint
│   └── 003_add_analysis_column.sql       # Adds the `analysis` jsonb column
│
├── config.py               # Typed config loaded from environment/.env
├── exceptions.py           # VeillIAError hierarchy
├── logging_config.py       # Centralized logging setup
├── main.py                 # Entry point: summarization
├── classify_main.py        # Entry point: topic classification
├── analysis_main.py        # Entry point: structured analysis
├── requirements.txt
├── .env.example
└── README.md
```

### Why it's structured this way

| Principle | How it's applied |
|---|---|
| **Single Responsibility** | `OllamaClient` only talks HTTP to Ollama. `PromptBuilder` only builds text. `SummaryValidator` only judges quality. `SupabaseArticleRepository` only does I/O. |
| **Open/Closed** | Adding a new model backend = new class implementing `LLMClient` in `llm/`. Nothing else changes. |
| **Liskov Substitution** | `SummarizationPipeline` only ever calls methods declared on the `ArticleRepository`, `Summarizer`, `LLMClient` interfaces — any conforming implementation works. |
| **Interface Segregation** | Interfaces (`llm/base.py`, `database/base.py`) are small and focused — no fat "God interfaces". |
| **Dependency Inversion** | High-level `SummarizationPipeline` depends on abstractions, not on `OllamaClient`/`SupabaseArticleRepository` directly. Concrete wiring happens once, in `main.py` (the composition root). |

### Extending the system later

Because of this structure, the following can be added **without major
architectural changes**:

- **New local LLMs** → implement `LLMClient` (e.g. `LlamaCppClient`, `VLLMClient`).
- **Multilingual summarization** → extend `PromptBuilder` to accept a target language, or add a `MultilingualPromptBuilder`.
- **Batch/async processing** → `SummarizationPipeline.run()` already works in batches (`BATCH_SIZE`); an `AsyncSummarizationPipeline` using `asyncio`/`httpx.AsyncClient` can be added alongside it, reusing the same interfaces.
- **Article classification / keyword extraction / embeddings** → new sibling services (e.g. `services/classifier.py`, `services/keyword_extractor.py`) that reuse `LLMClient` and `ArticleRepository`, orchestrated from `main.py` or a shared pipeline runner.
- **Trend detection** → a downstream service reading persisted summaries/embeddings, independent of this pipeline.

---

## 2. Prerequisites

- **Python 3.14**
- A **Supabase** project with the `articles` table already populated (Stage 1 of VeillIA)
- **Ollama** installed locally, with a model pulled

---

## 3. Installing Ollama and a model

### Install Ollama

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:** download the installer from [https://ollama.com/download](https://ollama.com/download)

Verify it's installed:
```bash
ollama --version
```

### Start the Ollama server

```bash
ollama serve
```
(On macOS/Windows the desktop app usually starts this automatically. Leave it running — the summarizer talks to it over HTTP on `http://127.0.0.1:11434`.)

### Pull a model

Any of these work out of the box:

```bash
ollama pull llama3.2      # good default balance of speed/quality
ollama pull qwen2.5        # strong multilingual support
ollama pull mistral        # solid general-purpose alternative
```

You can list what's installed with:
```bash
ollama list
```

Test it directly (optional sanity check):
```bash
ollama run llama3.2 "Summarize: The sky is blue because of Rayleigh scattering."
```

> **Windows note (important):** keep `OLLAMA_URL` set to `http://127.0.0.1:11434`,
> not `http://localhost:11434`. On some Windows setups `localhost` resolves to
> the IPv6 address `::1` first, and if Ollama isn't listening on IPv6 the
> request just hangs until it hits `OLLAMA_TIMEOUT_SECONDS` (120s by default)
> — which looks exactly like a slow/stuck model rather than a network issue.
> If every request times out at almost exactly the same duration regardless
> of content size, this is the first thing to check.
>
> Also make sure `OLLAMA_MODEL` includes an explicit tag (e.g. `qwen2.5:3b`,
> not just `qwen2.5`) — without one, Ollama may try to resolve/pull
> `<model>:latest` mid-generation, which can also present as a long timeout.

---

## 4. Installation

```bash
# 1. Clone / copy the project, then enter it
cd veillia-summarizer

# 2. Create a virtual environment
python3.14 -m venv venv #or py -3.14 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# then edit .env with your Supabase URL/key and desired Ollama model
```

### `.env` reference

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
SUPABASE_TABLE=articles

OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_SECONDS=120
OLLAMA_TEMPERATURE=0.3
OLLAMA_MAX_RETRIES=3
OLLAMA_RETRY_BACKOFF_SECONDS=2.0

SUMMARY_MIN_WORDS=100
SUMMARY_MAX_WORDS=200
SUMMARY_LANGUAGE=en
BATCH_SIZE=10

LOG_LEVEL=INFO
```

To switch models, just change `OLLAMA_MODEL` (after pulling it with `ollama pull <model>`) — **no code changes required**.

> **Note on `SUPABASE_KEY`**: use the `service_role` key if your `articles`
> table has row-level security enabled and this service needs to bypass it
> to read/write freely. Keep this key server-side only — never expose it to
> a browser/client.

---

## 5. Running

Make sure `ollama serve` is running and the model is pulled, then:

```bash
python main.py
```

Each run:
1. Confirms Ollama is reachable and the model is available.
2. Loads up to `BATCH_SIZE` articles where `summary` is `NULL`/empty.
3. Builds a prompt per article and generates a summary via the local LLM.
4. Validates each summary (length, not empty, not just the title, not longer than the source).
5. Updates the existing row's `summary` column in Supabase (no duplicates are ever created — always an `UPDATE ... WHERE id = ...`, never an `INSERT`).
6. Logs a run summary.

Run it repeatedly / on a schedule (cron, systemd timer, etc.) to keep working through the backlog — each run only picks up articles still missing a summary.

### Example log output

```
2026-07-13 10:02:11 | INFO     | __main__ | Starting VeillIA AI Summarizer
2026-07-13 10:02:11 | INFO     | __main__ | Config loaded | model=llama3.2 | ollama_url=http://127.0.0.1:11434 | batch_size=10 | word_range=30-60
2026-07-13 10:02:11 | INFO     | services.pipeline | Checking Ollama availability for model 'llama3.2'...
2026-07-13 10:02:11 | INFO     | services.pipeline | Loaded 6 unsummarized article(s).
2026-07-13 10:02:19 | INFO     | services.pipeline | Article 101 summarized successfully (48 words, 5.12s).
2026-07-13 10:02:27 | WARNING  | services.pipeline | Article 102 summary rejected: Summary too short (14 words).
2026-07-13 10:02:27 | INFO     | services.pipeline | Pipeline finished | model=llama3.2 | processed=6 | success=5 | failed=1 | skipped=0 | duration=32.10s
```

This gives you, per the requirements: **number of articles processed, successful
summaries, failed summaries, processing time, and the model used.**

---

## 6. Prompting approach

The summary is intentionally a **short, scannable teaser** (2-3 sentences,
~30-60 words), not an in-depth writeup — that's what the separate
[structured analysis](#10-structured-article-analysis) is for. A reader
should be able to grasp the main idea of an article in a few seconds by
reading just the summary, and go read the full analysis if they want depth.

`llm/prompts.py` instructs the model to:
- Lead with the single most important, concrete fact — not a vague intro sentence.
- Stay strictly factual and only use information present in the article (explicit anti-hallucination instruction, reinforced by the system prompt).
- Be tightly concise (30–60 words / 2-3 sentences, configurable) and capture only the core idea — not attempt to cover every angle the way a full analysis would.
- Avoid markdown, bullet points, or repeating the title verbatim.

`services/validator.py` then acts as a safety net: it rejects summaries that are
empty, too short/long (with a small fixed word-count buffer around the
target — a percentage-based tolerance would let an old-style 100+ word
summary slip through a 30-60 word target), identical to the title, or
longer than the source article (a cheap but effective hallucination signal
— a summary shouldn't be padding itself with invented content).

### Chunked ("split → summarize → merge") summarization

By default (`SUMMARY_USE_CHUNKING=true`), long articles are **not** sent to
the model in one giant prompt. Instead, `ChunkedLLMSummarizer`
(`llm/summarizer.py`) does this:

1. **Split** — `TextChunker` (`llm/text_chunker.py`) splits `article.content`
   into `SUMMARY_NUM_CHUNKS` (default 3) roughly-equal parts, breaking only
   on whitespace so no word is cut in half.
2. **Summarize each part** — every chunk gets its own short, focused prompt
   (`PromptBuilder.build_partial_summary_prompt`), asking for a factual
   20–30 word summary of just that fragment.
3. **Merge** — the partial summaries are combined into one prompt
   (`PromptBuilder.build_merge_prompt`) asking the model to produce a single
   short, engaging 30–60 word (2-3 sentence) summary, with redundancy between parts removed.

Articles shorter than `SUMMARY_CHUNKING_MIN_CHARS` (default 600 characters)
skip chunking entirely and go through `LLMSummarizer`'s single-pass prompt
instead — splitting a short article into thirds adds overhead for no
benefit.

**Why this helps, especially on memory-constrained machines:**
- Each individual LLM call handles a much smaller prompt (roughly 1/3 of
  the article) instead of the whole thing, which is faster and needs less
  context/RAM per call than one large request.
- Nothing from the article gets silently dropped — every part is read and
  summarized, unlike simple truncation (which would just cut off the end
  of a long article).
- If you still hit timeouts even with chunking, raising `SUMMARY_NUM_CHUNKS`
  (e.g. to 4-5) makes each individual call smaller and may help further.

Set `SUMMARY_USE_CHUNKING=false` to go back to the original single-pass
`LLMSummarizer` for every article, regardless of length.

---

## 7. Error handling & resilience

- All external calls (Ollama HTTP requests, Supabase queries) are wrapped and raise typed exceptions (`LLMError`, `DatabaseError`) instead of leaking raw exceptions.
- Ollama generation retries with exponential backoff (`OLLAMA_MAX_RETRIES`, `OLLAMA_RETRY_BACKOFF_SECONDS`).
- A failed or rejected summary for one article never stops the batch — the pipeline logs it and moves to the next article.
- Missing/invalid configuration fails fast with a clear `ConfigurationError` before any network calls are made.

---

## 8. Testing the pipeline without a real Ollama/Supabase connection

Because every dependency sits behind an interface, you can unit-test
`SummarizationPipeline` with fakes, e.g.:

```python
class FakeLLM(LLMClient):
    def generate(self, prompt, *, system_prompt=None): return "..." 
    def health_check(self): return True
    @property
    def model_name(self): return "fake-model"

class FakeRepo(ArticleRepository):
    def get_unsummarized_articles(self, limit): return [...]
    def update_summary(self, article_id, summary): ...
```
No real network calls needed for pipeline-level tests.

---

## 9. Topic classifier

A second, independent pipeline that assigns each article one of seven topics,
using the exact same local Ollama backend as the summarizer -- no extra
service, no extra dependency.

**Categories**: `recherche`, `startup`, `ecosysteme`, `evenement`, `tendance`, `reglementation`, `produit_ia`.

### Setup (one-time)

Run both migrations, in order, in the Supabase SQL Editor:

```sql
-- 001_add_category_column.sql
alter table articles add column if not exists category text;

-- 002_add_produit_ia_category.sql
-- (adds "produit_ia" to the check constraint's allowed values)
```
(`001` also adds a check constraint restricting values to the known categories, as a database-level safety net; `002` updates that constraint to include `produit_ia`)

### Language-independent category matching

The classifier prompt asks the model for a French category name, but small
local models sometimes drift into English or another language (e.g.
answering `"Research"` instead of `"Recherche"`). Storing that raw answer
directly would silently reject valid classifications just because of a
language mismatch.

`Category.from_text()` (`models/category.py`) handles this in two steps:

1. **Normalize** -- lowercase, strip accents/diacritics, collapse
   punctuation (so `"Écosystème."`, `"ECOSYSTEME"`, and `"ecosystem"` all
   normalize to the same comparable form).
2. **Match** -- compare against the canonical French value *and* a table of
   known translations/variants per category (e.g. `research`, `study`,
   `product`, `regulation`, `policy`, `trend`...), including a substring
   fallback for answers wrapped in extra words (e.g. `"Category: startup"`).

Whatever language or phrasing the model answers in, the **canonical French
value is always what gets stored** in Supabase -- e.g. the model can answer
`"Research"`, `"recherche"`, or `"RECHERCHE."` and all three are saved as
`recherche`. Only a genuinely unrecognized answer is rejected.

To extend this for a new drift pattern you notice in the logs, add the
variant to `_RAW_ALIASES` in `models/category.py` -- no other file needs to
change.

### Run

```bash
python classify_main.py
```

Same `.env` as the summarizer. Extra knobs available:

```env
CLASSIFICATION_BATCH_SIZE=20
CLASSIFICATION_MAX_CONTENT_CHARS=3000
CLASSIFICATION_USE_CHUNKING=true
CLASSIFICATION_NUM_CHUNKS=3
CLASSIFICATION_CHUNKING_MIN_CHARS=600
```

### Chunked ("split → classify → majority vote") classification

By default (`CLASSIFICATION_USE_CHUNKING=true`), `ChunkedLLMTopicClassifier`
(`llm/classifier.py`) avoids sending a long article to the model in one
request:

1. **Split** — `TextChunker` splits the content into `CLASSIFICATION_NUM_CHUNKS`
   (default 3) parts.
2. **Classify each part independently** — every chunk gets its own short
   classification prompt (`ClassificationPromptBuilder.build_chunk_classification_prompt`).
3. **Majority vote** — the final category is whichever category the most
   chunks agreed on (ties go to the earliest chunk). Chunks whose output
   couldn't be matched to any known category are simply excluded from the
   vote rather than failing the whole article.

Articles shorter than `CLASSIFICATION_CHUNKING_MIN_CHARS` (default 600
characters) skip chunking and go through `LLMTopicClassifier`'s single-pass
prompt instead. See [section 12](#12-managing-timeouts-on-constrained-machines-chunking-everywhere)
for why this matters on memory-constrained machines.

### Why classification is lighter than summarization

The model only has to output a single word (the category), instead of
30-60 words of prose. That means less generation time per article --
useful if your machine is RAM-constrained, since most of the cost of a
request is model load time and per-token generation, not prompt size.

`OLLAMA_KEEP_ALIVE` (default `5m`) also keeps the model resident in memory
between requests, avoiding a slow reload before every single article --
this benefits both pipelines but matters most on lower-RAM machines
processing a batch.

### How it fits the existing architecture

Same shape as the summarizer, so it was added without changing anything
already built:

| Concern | Summarizer | Classifier |
|---|---|---|
| Repository interface | `ArticleRepository` | `ArticleClassificationRepository` (new, separate -- Interface Segregation) |
| Prompt builder | `PromptBuilder` | `ClassificationPromptBuilder` |
| Task class | `Summarizer` / `LLMSummarizer` | `TopicClassifier` / `LLMTopicClassifier` |
| Validator | `SummaryValidator` | `ClassificationValidator` |
| Orchestrator | `SummarizationPipeline` | `ClassificationPipeline` |
| Entry point | `main.py` | `classify_main.py` |

Both pipelines depend on the same `LLMClient` interface and can even run
different models if desired (e.g. a smaller/faster model for
classification, a larger one for summaries) purely via `.env`.

### A note on the "tendance" category

Right now `tendance` is classified the same way as the other six: the LLM
judges it from a single article's content. If VeillIA later wants genuine
trend *detection* (patterns across many articles over time, not just a
per-article label), that would be a separate downstream service reading
already-classified/summarized articles in aggregate -- it fits cleanly on
top of this pipeline without changing it, per the extensibility goals in
section 1.

## 10. Structured article analysis

A third, independent pipeline that produces a business-oriented structured
analysis for each article -- richer than the summary, and separate from the
category -- using the same local Ollama backend as everything else.

This is deliberately the counterpart to the short summary from section 6:
the `summary` column is a 30-60 word teaser for scanning a feed, while
`analysis` is where a reader goes for depth once something catches their
eye.

**Fields produced** (stored as one `analysis` jsonb object per article):

| Field | Description |
|---|---|
| `concise_summary` | 2-3 factual sentences |
| `key_insight` | The single most important takeaway |
| `business_impact` | Short paragraph on commercial/business impact |
| `opportunities` | List of opportunities (can be empty) |
| `risks` | List of risks (can be empty) |
| `affected_industries` | List of industries/sectors mentioned |
| `conclusion` | 1-2 closing sentences |

### Setup (one-time)

Run `migrations/003_add_analysis_column.sql` in the Supabase SQL Editor:

```sql
alter table articles add column if not exists analysis jsonb;
```

### Run

```bash
python analysis_main.py
```

Same `.env` as the other pipelines. Extra knobs:

```env
ANALYSIS_BATCH_SIZE=10
ANALYSIS_MAX_CONTENT_CHARS=4000
ANALYSIS_MIN_CONTENT_CHARS=30
ANALYSIS_MIN_SUMMARY_WORDS=8
ANALYSIS_MIN_INSIGHT_WORDS=3
ANALYSIS_USE_CHUNKING=true
ANALYSIS_NUM_CHUNKS=3
ANALYSIS_CHUNKING_MIN_CHARS=800
```

### Chunked analysis: notes → two lighter generation calls

A full, single-call analysis (all 7 sections from the raw article in one
request) is the **heaviest single request in the whole project** -- long
input, long output. By default (`ANALYSIS_USE_CHUNKING=true`),
`ChunkedLLMArticleAnalyzer` (`llm/analyzer.py`) avoids that:

1. **Extract notes per chunk** — `TextChunker` splits the content into
   `ANALYSIS_NUM_CHUNKS` (default 3) parts, and each part gets a short,
   cheap prompt (`build_chunk_notes_prompt`) asking for 40-60 words of
   factual notes -- not a full analysis, just digested facts.
2. **Two lighter generation calls instead of one heavy one** — the
   digested notes (much shorter than the raw article) are fed into:
   - `build_narrative_sections_prompt` → produces `RESUME_CONCIS`,
     `INSIGHT_CLE`, `IMPACT_BUSINESS`, `CONCLUSION` (4 sections).
   - `build_list_sections_prompt` → produces `OPPORTUNITES`, `RISQUES`,
     `INDUSTRIES_AFFECTEES` (3 sections).
3. The two results are merged into one `ArticleAnalysis` in code (no LLM
   merge needed -- the two calls produce disjoint fields).

So a long article costs `ANALYSIS_NUM_CHUNKS + 2` smaller calls instead of
1 very large one -- each individual call has far less to generate, which
is the main lever for avoiding timeouts on constrained machines (see
[section 12](#12-managing-timeouts-on-constrained-machines-chunking-everywhere)).
Articles shorter than `ANALYSIS_CHUNKING_MIN_CHARS` (default 800
characters) skip this and use the single-call `LLMArticleAnalyzer` instead.

`ANALYSIS_MIN_CONTENT_CHARS` (default 30) is intentionally low: many
scraped articles only have a short excerpt rather than the full page text,
and the goal is a best-effort analysis from whatever is available, not
skipping most of the table. The prompt itself also tells the model to work
with limited text rather than refuse -- it fills every section from the
title + whatever excerpt exists, and only falls back to "Aucune identifiée"
/ "Non précisé" for the list sections (opportunities/risks/industries) when
there's genuinely nothing concrete to point to. Lower
`ANALYSIS_MIN_CONTENT_CHARS` further (even to `1`) if you want every
article attempted regardless of length.

### Why labeled sections instead of raw JSON

The prompt (`llm/prompts.py::AnalysisPromptBuilder`) asks the model for
plain-text output with fixed labels (`RESUME_CONCIS:`, `INSIGHT_CLE:`, ...)
rather than JSON. Small local models (llama3.2, qwen2.5:3b) are noticeably
less reliable at producing syntactically valid JSON on the first try than
at following a simple `LABEL:\ntext` template -- and a malformed JSON
response fails 100% of the time, while a labeled-section response degrades
gracefully (missing/empty sections are caught individually).

`llm/analysis_parser.py::AnalysisParser` turns that labeled text into a
structured `ArticleAnalysis`:
- List sections (`opportunities`, `risks`, `affected_industries`) are split
  on `-`/`*`/`•` bullets, with a comma-separated fallback if the model
  ignores the one-per-line instruction.
- Explicit "nothing to report" phrases (e.g. "Aucune identifiée") are
  normalized to an empty list rather than kept as a placeholder string.
- If any of the three critical sections (`concise_summary`, `key_insight`,
  `conclusion`) is missing or empty, parsing raises `AnalysisParseError`
  and the article is marked failed rather than silently persisting a
  half-empty analysis.

`services/analysis_validator.py` then applies a second, lighter check
(minimum word counts, not identical to the title) before anything is
written to Supabase.

### Running it automatically after collection

This pipeline follows the same batch pattern as `main.py`/`classify_main.py`
rather than reacting to each database insert individually (which would need
a webhook/server component). To approximate "runs automatically after
scraping", schedule the pipelines to run right after collection finishes,
in order:

```bash
python main.py            # summaries
python classify_main.py   # categories
python analysis_main.py   # structured analysis
```

e.g. via a cron job (Linux/macOS) or Task Scheduler (Windows) triggered
after your collection stage completes, or chained in the same script/CI
job that already runs collection.

## 11. Article AI Chat (interactive API)

Unlike every other pipeline in this project (one-shot batch scripts), this
is a **long-lived HTTP server**: the frontend's article page has a chat
where a user can ask questions about that specific article -- clarify a
term, get a simpler explanation of a section, dig deeper into a topic,
ask about implications/opportunities/risks -- and expects a live reply.

### Setup

No migration needed -- this reads existing `content`/`summary`/`analysis`
columns, it doesn't write anything new to Supabase.

```bash
python chat_server_main.py
```
This starts a FastAPI server (default `http://0.0.0.0:8000`), configurable via:
```env
CHAT_HOST=0.0.0.0
CHAT_PORT=8000
CHAT_MAX_CONTENT_CHARS=3000
CHAT_MAX_HISTORY_TURNS=12
```

### API

```
POST /articles/{article_id}/chat
```
```json
{
  "message": "What does fine-tuning mean?",
  "conversation_history": [
    {"role": "user", "content": "What is this article about?"},
    {"role": "assistant", "content": "It's about a new funding round for Mistral AI."}
  ]
}
```
Response:
```json
{"article_id": 42, "reply": "Fine-tuning means adapting a pre-trained model to a specific task..."}
```
- `404` if the article doesn't exist.
- `422` if `message` is empty (Pydantic validation).
- `503` if Ollama is unreachable or fails to generate a reply.

The backend is **stateless** -- the frontend owns the conversation and
resends `conversation_history` with each request. Persisting conversations
server-side (a `chat_messages` table, keyed by article + session) would be
a natural next step, but wasn't part of this scope.

### How answers stay grounded (no hallucination)

`llm/chat_prompt.py::ArticleChatPromptBuilder` builds a system prompt that:
1. Embeds the article's title, a truncated excerpt of its content, its
   short `summary`, and its full structured `analysis` (all fields:
   concise_summary, key_insight, business_impact, opportunities, risks,
   affected_industries, conclusion) as the **only source of truth for facts**.
2. Instructs the model to say the information isn't available in the
   article rather than guess, for anything not covered by that context.
3. Allows one narrow exception: explaining a technical term, acronym, or
   concept that *appears in* the article (e.g. "what is RAG?") using the
   model's general knowledge -- this is framed explicitly as a pedagogical
   clarification, never as license to add new facts about the article's
   actual story (companies, numbers, dates, outcomes).

### Why /api/chat instead of /api/generate

`LLMClient` gained a second method, `chat()`, alongside the existing
`generate()` (implemented by `OllamaClient` against Ollama's `/api/chat`
endpoint). It sends the conversation as structured `{role, content}` turns
rather than flattening history into one prompt string, which both models
handle more coherently across follow-up questions. `OllamaClient`'s retry
logic was factored into a shared private helper so `generate()` and
`chat()` don't duplicate it.

### Low-latency design choices

- **Reuses the stored `analysis`** -- never regenerates it. The whole
  point of storing analysis ahead of time (see section 10) is to make chat
  replies fast; this endpoint only ever *reads* `analysis`, `summary`, and
  `content` from Supabase, a single-row lookup by primary key.
- **Singleton dependencies** (`api/dependencies.py`): the Supabase client
  and Ollama `requests.Session` are built exactly once at server startup
  and reused across every request, not recreated per call.
- **`OLLAMA_KEEP_ALIVE`** (already used by the other pipelines) keeps the
  model resident in memory between chat messages too.
- **Bounded context**: `CHAT_MAX_CONTENT_CHARS` caps how much raw article
  text is sent, and `CHAT_MAX_HISTORY_TURNS` caps how many prior turns are
  replayed -- so a long conversation doesn't make every subsequent reply
  progressively slower.
- **Analysis-aware context reduction**: once an article has a stored
  `analysis`, the raw content included in chat context drops from
  `CHAT_MAX_CONTENT_CHARS` (3000 by default) to `CHAT_MAX_CONTENT_CHARS_WITH_ANALYSIS`
  (800 by default) -- the analysis already distills the article's facts,
  so the full excerpt is mostly redundant. This is the same "keep every
  request small" principle as the chunked pipelines, applied to a live,
  latency-sensitive endpoint where a multi-call split/merge isn't practical.

## 12. Managing timeouts on constrained machines: chunking everywhere

If you're running Ollama on a machine with limited RAM, the single biggest
cause of `Read timed out` errors is a **prompt that's too large for one
request** -- either a lot of input text, a lot of output text to generate,
or both. Every pipeline in this project has a chunking strategy specifically
to keep individual requests small, so no single call has to do too much at once:

| Pipeline | Strategy | Heaviest single call, chunking OFF | Heaviest single call, chunking ON (default) |
|---|---|---|---|
| Summarizer | Split → summarize each part → merge | 1 call, full article in, 30-60 words out | `SUMMARY_NUM_CHUNKS` calls (20-30 words out each) + 1 merge call (30-60 words out) |
| Classifier | Split → classify each part → majority vote | 1 call, full article in, 1 word out | `CLASSIFICATION_NUM_CHUNKS` calls, each a small chunk in, 1 word out |
| Analyzer | Split → extract notes → 2 lighter generations | 1 call, full article in, **7 sections out** (heaviest in the project) | `ANALYSIS_NUM_CHUNKS` note calls (40-60 words out each) + 2 calls of ~half the sections each |
| Chat | Context-size reduction (not split/merge -- see above) | up to `CHAT_MAX_CONTENT_CHARS` of raw content per message | up to `CHAT_MAX_CONTENT_CHARS_WITH_ANALYSIS` once analysis exists |

All three batch pipelines (`SUMMARY_USE_CHUNKING`, `CLASSIFICATION_USE_CHUNKING`,
`ANALYSIS_USE_CHUNKING`) default to `true`. Each has its own `_NUM_CHUNKS`
and `_CHUNKING_MIN_CHARS` (the length below which chunking is skipped, since
splitting a short article into thirds only adds overhead). If timeouts
persist even with chunking on, try, in order:

1. **Increase the relevant `_NUM_CHUNKS`** (e.g. `ANALYSIS_NUM_CHUNKS=5`) --
   smaller individual chunks means less content per call.
2. **Double-check `OLLAMA_MODEL` has an explicit tag** (e.g. `qwen2.5:3b`,
   not just `qwen2.5`). Without a tag, Ollama may resolve to `:latest`,
   which can trigger an unexpected pull/resolution mid-request if that
   exact tag isn't already local -- this can look exactly like a hung
   generation call. Confirm with `ollama list` that the tag you're
   configuring is the one actually pulled.
3. **Close other applications** to free RAM before running a batch --
   `ollama run <model> "hello"` taking more than a few seconds with nothing
   else running is a strong sign the machine is memory-constrained, not a
   configuration problem.
4. **Try a smaller model** (e.g. `qwen2.5:0.5b`, `llama3.2:1b`) if the
   above still isn't enough.
5. **Increase `OLLAMA_TIMEOUT_SECONDS`** as a last resort/temporary
   mitigation -- this buys time but doesn't reduce the underlying load,
   so prefer the options above first.

## 13. Roadmap toward full VeillIA integration

This service is intentionally self-contained (its own `main.py`, its own
`.env`) so it can be:
- run as a standalone cron job / worker today, and
- imported as a library (`from services.pipeline import SummarizationPipeline`) into the main VeillIA orchestrator later, with the composition root moved from `main.py` into VeillIA's own service wiring.
