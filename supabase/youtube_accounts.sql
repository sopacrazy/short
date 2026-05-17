-- Multi-account YouTube support
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS youtube_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT,
  channel_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS youtube_accounts_user_id_idx ON youtube_accounts(user_id);

ALTER TABLE folders ADD COLUMN IF NOT EXISTS youtube_account_id UUID REFERENCES youtube_accounts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE youtube_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own youtube accounts" ON youtube_accounts;
CREATE POLICY "Users can manage their own youtube accounts"
  ON youtube_accounts FOR ALL
  USING (auth.uid() = user_id);

-- Tabela para rastrear agendamentos YouTube por canal
CREATE TABLE IF NOT EXISTS youtube_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_account_id UUID REFERENCES youtube_accounts(id) ON DELETE CASCADE,
  title TEXT,
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  youtube_video_id TEXT,
  youtube_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS youtube_schedules_user_id_idx ON youtube_schedules(user_id);
CREATE INDEX IF NOT EXISTS youtube_schedules_account_id_idx ON youtube_schedules(youtube_account_id);

ALTER TABLE youtube_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own youtube schedules" ON youtube_schedules;
CREATE POLICY "Users can manage their own youtube schedules"
  ON youtube_schedules FOR ALL
  USING (auth.uid() = user_id);
