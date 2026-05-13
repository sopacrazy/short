-- Tabela de posts de curiosidades (galeria + agendamento)
CREATE TABLE IF NOT EXISTS curiosity_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  folder_id           UUID REFERENCES curiosity_folders(id) ON DELETE SET NULL,

  -- Conteúdo do post
  title_white         TEXT NOT NULL DEFAULT '',
  title_yellow        TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  cta                 TEXT NOT NULL DEFAULT '',
  caption             TEXT NOT NULL DEFAULT '',
  hashtags            TEXT[] NOT NULL DEFAULT '{}',
  image_prompt        TEXT,
  image_url           TEXT,                  -- URL bruta do Flux/Replicate
  composed_image_path TEXT,                  -- caminho no bucket Supabase (para gerar signed URL)

  -- Status
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  error_message       TEXT,

  -- Agendamento / publicação
  scheduled_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  instagram_post_id   TEXT,
  instagram_post_url  TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS curiosity_posts_user_id_idx       ON curiosity_posts(user_id);
CREATE INDEX IF NOT EXISTS curiosity_posts_status_idx        ON curiosity_posts(status);
CREATE INDEX IF NOT EXISTS curiosity_posts_scheduled_at_idx  ON curiosity_posts(scheduled_at) WHERE status = 'scheduled';

-- RLS
ALTER TABLE curiosity_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own curiosity posts" ON curiosity_posts;
CREATE POLICY "Users manage own curiosity posts" ON curiosity_posts
  FOR ALL USING (auth.uid() = user_id);

-- Trigger updated_at (reutiliza função se já existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_curiosity_posts_updated_at ON curiosity_posts;
CREATE TRIGGER update_curiosity_posts_updated_at
  BEFORE UPDATE ON curiosity_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
