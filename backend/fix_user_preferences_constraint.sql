-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add missing UNIQUE constraint on user_preferences.user_id
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Why: The original CREATE TABLE used `CREATE TABLE IF NOT EXISTS`, which is a
-- no-op when the table already exists. This means `user_id UNIQUE` was never
-- applied to the live table, causing any ON CONFLICT upsert to fail with
-- PostgreSQL error 42P10.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Remove duplicate rows (keep the most recently updated one per user).
-- Safe to run even if there are no duplicates.
DELETE FROM public.user_preferences
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_preferences
  ORDER BY user_id, updated_at DESC NULLS LAST
);

-- Step 2: Add the unique constraint if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_preferences'::regclass
      AND contype = 'u'
      AND conname = 'user_preferences_user_id_key'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'Unique constraint added on user_preferences.user_id';
  ELSE
    RAISE NOTICE 'Unique constraint already exists — skipping.';
  END IF;
END
$$;
