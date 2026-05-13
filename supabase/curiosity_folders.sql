-- Rodar no SQL Editor do painel Supabase

CREATE TABLE IF NOT EXISTS curiosity_folders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '📁',
  language    TEXT NOT NULL DEFAULT 'pt',
  logo_data   TEXT,          -- base64 data URL da logo (redimensionada para ~200px no cliente)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE curiosity_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia suas próprias pastas"
  ON curiosity_folders FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
