-- Auth rewrite, part 1 of 2: username/password accounts + Strava as an
-- optional per-user connection.
--
-- RUN ORDER: run this file, then `npx tsx scripts/backfill-users.ts`
-- (creates the initial accounts and populates user_id on existing rows),
-- then run 20260728000001_auth_rewrite_part2.sql. Part 2 must run AFTER the
-- backfill because it makes user_id the primary key on some tables, which
-- fails if any row still has a NULL user_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS strava_connections (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  athlete_id BIGINT UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- google_tokens/google_calendar_events were defined in an earlier migration
-- file but never actually applied to the live database — create them here
-- too (idempotent) so the ALTERs below don't fail on a missing table.
CREATE TABLE IF NOT EXISTS google_tokens (
  athlete_id BIGINT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_calendar_events (
  athlete_id BIGINT NOT NULL,
  activity_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  date TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (athlete_id, activity_id)
);

-- Add user_id to every existing table that was previously keyed by the
-- client-supplied Strava athlete_id. athlete_id columns are left in place
-- (unused as a trust boundary going forward) rather than dropped. Nullable
-- for now — the backfill script populates these before part 2 tightens them.
-- `IF EXISTS` on each ALTER guards against any of these tables turning out
-- to be missing too, the way google_tokens was.
ALTER TABLE IF EXISTS activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS race_goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS coach_plans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS training_plan ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS habit_definitions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS habit_completions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS google_tokens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS google_calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS reflection_conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Index creation needs its own existence guard per table (CREATE INDEX has
-- no "IF EXISTS table" form) — skip cleanly instead of erroring if missing.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'activities', 'race_goals', 'coach_plans', 'training_plan',
    'habit_definitions', 'habit_completions', 'google_tokens',
    'google_calendar_events', 'reflection_conversations'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id)', 'idx_' || tbl || '_user', tbl);
    ELSE
      RAISE NOTICE 'Skipping index on % — table does not exist', tbl;
    END IF;
  END LOOP;
END $$;
