-- MIGRATION: AstraShorts SaaS Transition
-- Transforma o banco de dados em multi-tenancy e adiciona suporte a chaves de API por usuário.

-- 1. Tabela de Configurações de IA por Usuário
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    openai_key TEXT,
    replicate_token TEXT,
    elevenlabs_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualização das tabelas existentes para incluir user_id
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Refatoração da tabela youtube_tokens para ser por usuário
-- Primeiro limpamos dados antigos para evitar erros de constraint NOT NULL
TRUNCATE TABLE public.youtube_tokens;

ALTER TABLE public.youtube_tokens DROP CONSTRAINT IF EXISTS youtube_tokens_pkey CASCADE;
ALTER TABLE public.youtube_tokens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Removemos a coluna ID antiga se existir
ALTER TABLE public.youtube_tokens DROP COLUMN IF EXISTS id;

-- Define user_id como a nova Chave Primária
ALTER TABLE public.youtube_tokens ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.youtube_tokens ADD PRIMARY KEY (user_id);

-- 4. Habilitar RLS em todas as tabelas
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_tokens ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas de RLS (Isolamento por Usuário)

-- Folders: Usuário vê e edita apenas suas pastas
CREATE POLICY "Users can manage their own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id);

-- Projects: Usuário vê e edita apenas seus projetos
CREATE POLICY "Users can manage their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

-- Scripts: Acesso via projeto (o projeto deve pertencer ao usuário)
CREATE POLICY "Users can manage scripts of their projects" ON public.scripts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid()
        )
    );

-- Scenes: Acesso via projeto
CREATE POLICY "Users can manage scenes of their projects" ON public.scenes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()
        )
    );

-- Narrations: Acesso via projeto
CREATE POLICY "Users can manage narrations of their projects" ON public.narrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = narrations.project_id AND projects.user_id = auth.uid()
        )
    );

-- Export Metadata: Acesso via projeto
CREATE POLICY "Users can manage export_metadata of their projects" ON public.export_metadata
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = export_metadata.project_id AND projects.user_id = auth.uid()
        )
    );

-- User Settings: Acesso apenas ao próprio registro
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- YouTube Tokens: Acesso apenas ao próprio registro
CREATE POLICY "Users can manage their own youtube tokens" ON public.youtube_tokens
    FOR ALL USING (auth.uid() = user_id);

-- 6. Bucket de Storage (RLS para áudio/cenas)
-- Nota: Supabase Storage RLS é configurado via políticas no bucket 'audio'
-- Adicionar políticas no dashboard do Supabase para o bucket 'audio' se necessário.
