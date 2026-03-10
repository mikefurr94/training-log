-- Coach Plans table for storing AI-generated training plans
CREATE TABLE coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  race_name TEXT,
  race_date TEXT,
  race_distance TEXT,
  goal_time TEXT,
  preferences JSONB DEFAULT '{}',
  weeks JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active',
  conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by athlete + status
CREATE INDEX idx_coach_plans_athlete_status ON coach_plans (athlete_id, status);
