-- Habit definitions table for cross-device sync of habit list
CREATE TABLE habit_definitions (
  athlete_id BIGINT PRIMARY KEY,
  habits JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
