-- VeillIA: profiles table + Row Level Security policies
-- Run this in the Supabase SQL editor (or via `supabase db push` / migration tooling).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair databases created with an earlier schema that referenced
-- public.users instead of Supabase's auth.users. `create table if not exists`
-- does not alter an existing foreign key, so this is required for upgrades.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- Keep updated_at current on every update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;

-- Users can read their own profile
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (role changes should go through an
-- admin-only path / service-role call, not this policy)
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts happen via the backend's service-role client right after sign-up,
-- so no anon/authenticated insert policy is defined here on purpose.
-- If you later want users to be able to create their own profile row
-- directly (e.g. from the client), add:
--
-- create policy "Users can insert their own profile"
--   on public.profiles for insert
--   with check (auth.uid() = id);
