-- Run this once in the Supabase SQL Editor before using analysis_main.py.

alter table articles
    add column if not exists analysis jsonb;

-- Speeds up "articles missing analysis" queries on large tables.
create index if not exists idx_articles_analysis_null
    on articles (collected_at)
    where analysis is null;

-- Example expected shape of the `analysis` column (for reference -- jsonb
-- has no fixed schema, this is just what analysis_main.py writes):
--
-- {
--   "concise_summary": "...",
--   "key_insight": "...",
--   "business_impact": "...",
--   "opportunities": ["...", "..."],
--   "risks": ["...", "..."],
--   "affected_industries": ["...", "..."],
--   "conclusion": "..."
-- }
