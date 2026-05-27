-- Habit completions table for cross-device sync of which habits were completed each day.
-- The POST handler in api/habits.ts upserts with onConflict: 'athlete_id,date', which
-- REQUIRES a unique (or primary key) constraint on (athlete_id, date) — otherwise
-- Supabase returns "no unique or exclusion constraint matching the ON CONFLICT" and
-- the API returns 500.

CREATE TABLE IF NOT EXISTS habit_completions (
  athlete_id BIGINT NOT NULL,
  date DATE NOT NULL,
  habit_ids JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (athlete_id, date)
);

-- Self-healing for older deployments that pre-date this file:
ALTER TABLE habit_completions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'habit_completions'
      AND c.contype IN ('p', 'u')
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
      ) = ARRAY['athlete_id', 'date']
  ) THEN
    ALTER TABLE habit_completions
      ADD CONSTRAINT habit_completions_athlete_date_key UNIQUE (athlete_id, date);
  END IF;
END $$;
