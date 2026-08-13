-- Run this once in the Supabase SQL Editor before using classify_main.py.

alter table articles
    add column if not exists category text;

-- Optional but recommended: restrict values to the known category set at
-- the database level, as a second safety net beyond the app-level validator.
-- Postgres doesn't support "ADD CONSTRAINT IF NOT EXISTS", so this checks
-- pg_constraint first to stay safely re-runnable.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'articles_category_check'
    ) then
        alter table articles
            add constraint articles_category_check
            check (category is null or category in (
                'recherche', 'startup', 'ecosysteme', 'evenement', 'tendance',
                'reglementation', 'produit_ia'
            ));
    end if;
end $$;

-- Optional: speeds up the "unclassified articles" query on large tables.
create index if not exists idx_articles_category_null
    on articles (collected_at)
    where category is null;
