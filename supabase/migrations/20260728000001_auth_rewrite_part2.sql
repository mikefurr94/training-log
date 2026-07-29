-- Auth rewrite, part 2 of 2.
--
-- RUN ORDER: only run this AFTER part 1 and `npx tsx scripts/backfill-users.ts`
-- have both completed — this makes user_id the primary key on some tables,
-- which fails if any row still has a NULL user_id.
--
-- athlete_id was NOT NULL (often the primary key) on several tables, which
-- would block rows for accounts that never connect Strava. Relax it, and for
-- the single-row-per-user tables, swap the primary key from athlete_id to
-- user_id so `upsert(..., { onConflict: 'user_id' })` works the way
-- `athlete_id` did before. Constraint names are looked up dynamically rather
-- than hardcoded, since some of these tables predate committed migrations.
DO $$
DECLARE
  pk_name text;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['race_goals', 'training_plan', 'google_tokens'] LOOP
    SELECT tc.constraint_name INTO pk_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = tbl AND tc.constraint_type = 'PRIMARY KEY';
    IF pk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tbl, pk_name);
    END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN athlete_id DROP NOT NULL', tbl);
    EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (user_id)', tbl);
  END LOOP;

  SELECT tc.constraint_name INTO pk_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'google_calendar_events' AND tc.constraint_type = 'PRIMARY KEY';
  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE google_calendar_events DROP CONSTRAINT %I', pk_name);
  END IF;
  ALTER TABLE google_calendar_events ALTER COLUMN athlete_id DROP NOT NULL;
  ALTER TABLE google_calendar_events ADD PRIMARY KEY (user_id, activity_id);
END $$;

-- coach_plans and activities key on their own id/UUID, not athlete_id — just
-- relax the NOT NULL so Strava-less users can insert rows.
ALTER TABLE coach_plans ALTER COLUMN athlete_id DROP NOT NULL;
ALTER TABLE activities ALTER COLUMN athlete_id DROP NOT NULL;
