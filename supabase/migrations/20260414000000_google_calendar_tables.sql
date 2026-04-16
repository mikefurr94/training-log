-- Google Calendar Integration Tables
-- Run this in the Supabase SQL editor

-- Store Google OAuth tokens per athlete
CREATE TABLE IF NOT EXISTS google_tokens (
  athlete_id BIGINT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Map planned activities to Google Calendar event IDs
CREATE TABLE IF NOT EXISTS google_calendar_events (
  athlete_id BIGINT NOT NULL,
  activity_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  date TEXT NOT NULL, -- 'YYYY-MM-DD'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (athlete_id, activity_id)
);

-- Index for quick lookups by athlete
CREATE INDEX IF NOT EXISTS idx_gcal_events_athlete ON google_calendar_events (athlete_id);
