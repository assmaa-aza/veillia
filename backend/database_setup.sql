-- ============================================================
-- VeillIA — Complete Database Setup Script
-- Run in the Supabase Dashboard → SQL Editor
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  username  text not null unique,
  full_name text,
  avatar_url text,
  role      text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "Profiles: owner select" on public.profiles;
create policy "Profiles: owner select"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Profiles: owner update" on public.profiles;
create policy "Profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Profiles: owner insert" on public.profiles;
create policy "Profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ──────────────────────────────────────────────────────────
-- 2. USER PREFERENCES TABLE
-- ──────────────────────────────────────────────────────────
create table if not exists public.user_preferences (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  role                   text,
  interests              text[] default '{}',
  content_types          text[] default '{}',
  followed_companies     text[] default '{}',
  preferred_language     text default 'Français',
  recommendation_frequency text default 'Quotidiennement',
  onboarding_completed   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- updated_at trigger for user_preferences
create or replace function public.set_user_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_user_preferences_updated_at();

-- RLS
alter table public.user_preferences enable row level security;

drop policy if exists "Preferences: owner select" on public.user_preferences;
create policy "Preferences: owner select"
  on public.user_preferences for select using (auth.uid() = user_id);

drop policy if exists "Preferences: owner insert" on public.user_preferences;
create policy "Preferences: owner insert"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Preferences: owner update" on public.user_preferences;
create policy "Preferences: owner update"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- 3. AUTO-SETUP TRIGGER ON AUTH.USERS INSERT
--
--    CRITICAL: uses EXCEPTION blocks so a failure in profile
--    or preference creation NEVER blocks user registration.
--    SECURITY DEFINER runs with superuser rights, bypassing RLS.
-- ──────────────────────────────────────────────────────────
create or replace function public.handle_new_user_setup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  -- Derive username: prefer metadata, fall back to email prefix
  v_username := coalesce(
    trim(new.raw_user_meta_data->>'username'),
    split_part(new.email, '@', 1)
  );

  -- Ensure uniqueness in case of collision
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 6);
  end if;

  -- Insert profile row — swallow any error so registration is never blocked
  begin
    insert into public.profiles (id, username, full_name, role)
    values (
      new.id,
      v_username,
      trim(new.raw_user_meta_data->>'full_name'),
      'user'
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user_setup: profiles insert failed for % — %', new.id, sqlerrm;
  end;

  -- Insert default preferences row — swallow any error
  begin
    insert into public.user_preferences (
      user_id,
      preferred_language,
      recommendation_frequency,
      onboarding_completed
    )
    values (
      new.id,
      'Français',
      'Quotidiennement',
      false
    )
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'handle_new_user_setup: user_preferences insert failed for % — %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Revoke execute from public and grant only to postgres / service_role
revoke execute on function public.handle_new_user_setup() from public;
grant  execute on function public.handle_new_user_setup() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_preferences on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_setup();
