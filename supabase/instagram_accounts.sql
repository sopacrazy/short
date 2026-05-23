-- Multi-account Instagram support
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_accounts_user_id_idx ON instagram_accounts(user_id);

ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own instagram accounts" ON instagram_accounts;
CREATE POLICY "Users can manage their own instagram accounts"
  ON instagram_accounts FOR ALL
  USING (auth.uid() = user_id);

-- Adiciona referência de conta ao scheduled_reels
ALTER TABLE scheduled_reels ADD COLUMN IF NOT EXISTS instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE SET NULL;

-- Migra dados existentes da tabela instagram_tokens → instagram_accounts
INSERT INTO instagram_accounts (user_id, access_token, instagram_user_id, username, expires_at, created_at, updated_at)
SELECT user_id, access_token, instagram_user_id, username, expires_at, created_at, updated_at
FROM instagram_tokens
ON CONFLICT DO NOTHING;
