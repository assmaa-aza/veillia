-- VeillIA: user_preferences table + Row Level Security policies
-- Run this in the Supabase SQL editor (or via `supabase db push` / migration tooling).

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text,
  interests text[] default '{}',
  content_types text[] default '{}',
  followed_companies text[] default '{}',
  preferred_language text default 'Français',
  recommendation_frequency text default 'Quotidiennement',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign key fix safety
alter table public.user_preferences drop constraint if exists user_preferences_user_id_fkey;
alter table public.user_preferences
  add constraint user_preferences_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Trigger to maintain updated_at column
create or replace function public.set_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.set_user_preferences_updated_at();

-- Row Level Security (RLS)
alter table public.user_preferences enable row level security;

-- Users can read their own preferences
drop policy if exists "Preferences viewable by owner" on public.user_preferences;
create policy "Preferences viewable by owner"
  on public.user_preferences for select
  using (auth.uid() = user_id);

-- Users can insert their own preferences
drop policy if exists "Preferences insertable by owner" on public.user_preferences;
create policy "Preferences insertable by owner"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

-- Users can update their own preferences
drop policy if exists "Preferences updatable by owner" on public.user_preferences;
create policy "Preferences updatable by owner"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
