-- ============================================================
-- VeillIA — Admin & Social Publications Setup Script
-- Run in the Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. ADD STATUS COLUMN TO ARTICLES
alter table public.articles
  add column if not exists status text not null default 'a_valider'
  check (status in ('a_valider', 'valide', 'refuse'));

-- Set existing summarized articles to 'valide' so home cards and discover feed display real approved articles
update public.articles
  set status = 'valide'
  where summary is not null and (status is null or status = 'a_valider');

-- Index on status for faster admin filtering
create index if not exists idx_articles_status
  on public.articles (status);

-- 2. CREATE SOCIAL PUBLICATIONS TABLE
create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  article_id bigint references public.articles(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram')),
  content text not null,
  image_url text,
  status text not null default 'a_valider' check (status in ('a_valider', 'valide', 'publie', 'refuse')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on platform and status
create index if not exists idx_social_pub_status
  on public.social_publications (status);

create index if not exists idx_social_pub_platform
  on public.social_publications (platform);

-- Trigger to auto-update updated_at timestamp
create or replace function public.set_social_publications_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_publications_updated_at on public.social_publications;
create trigger set_social_publications_updated_at
  before update on public.social_publications
  for each row execute function public.set_social_publications_updated_at();

-- Disable RLS or grant access for service_role and authenticated users
alter table public.social_publications enable row level security;

drop policy if exists "Social Pubs: public select" on public.social_publications;
create policy "Social Pubs: public select"
  on public.social_publications for select using (true);

drop policy if exists "Social Pubs: admin all" on public.social_publications;
create policy "Social Pubs: admin all"
  on public.social_publications for all using (true) with check (true);
