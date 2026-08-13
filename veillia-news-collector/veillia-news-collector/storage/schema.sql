-- storage/schema.sql
-- ---------------------------------------------------------------------
-- Run this once in your Supabase project (Dashboard -> SQL Editor ->
-- paste -> Run) to create the table that `SupabaseStorage` writes to.
--
-- The UNIQUE constraint on `url` is what makes the pipeline's upsert
-- ("insert, or update if it already exists") work correctly: running
-- the collector repeatedly will never create duplicate rows for the
-- same article.
-- ---------------------------------------------------------------------

create table if not exists public.articles (
    id            bigint generated always as identity primary key,
    title         text,
    url           text not null,
    source        text,
    author        text,
    published_at  timestamptz,
    summary       text,
    content       text,
    image_url     text,
    language      text default 'en',
    tags          jsonb default '[]'::jsonb,
    collected_at  timestamptz,

    constraint articles_url_key unique (url)
);

-- Speeds up "latest articles" queries and future dashboard/backend use.
create index if not exists articles_published_at_idx
    on public.articles (published_at desc);

create index if not exists articles_source_idx
    on public.articles (source);

-- Optional: Row Level Security. Disabled by default since this table is
-- written to by a trusted server-side pipeline (using the service_role
-- key). If you enable RLS, you'll need policies that allow your
-- pipeline's key to select/insert/update.
-- alter table public.articles enable row level security;
