# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Rodar frontend + backend juntos
npm run dev

# Separados
npm run dev:frontend        # Vite (porta dinâmica, host 0.0.0.0)
npm run dev:backend         # tsx watch backend/src/index.ts (porta 3001)

npm run build               # build frontend → ./dist
npm run lint                # type-check frontend (tsc --noEmit)

# Type-check backend (dentro de backend/)
npm run build --workspace=backend   # ou: cd backend && npx tsc --noEmit
```

## Variáveis de ambiente

Arquivo `.env` na raiz — o backend carrega automaticamente. Template em `.env.example`.

- **Obrigatórios:** `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
- **Opcionais (funcionalidades degradam):** `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`

## Banco de dados

Supabase. Schema completo em `supabase/schema.sql` — executar no SQL Editor do painel.

| Tabela | Propósito |
|--------|-----------|
| `projects` | Registro principal; tem `status` (máquina de estado) e `folder_id` |
| `scripts` | 1:1 com projeto; contém hook, body, CTA, voice_tone |
| `scenes` | 1:N com projeto; cada cena tem `image_prompt` e `image_url` |
| `narrations` | Áudio TTS; coluna `timestamps` (JSONB) com marcações por caractere |
| `export_metadata` | SEO: video_title, description, hashtags[], thumbnail_url, video_url |
| `folders` | Organização; tem `default_voice_id` e `default_language` |

**Storage buckets:** `audio` (narração MP3, end-cards, soundtracks) e `videos` (renders finais).

**Status do projeto (sequência):**
```
draft → generating_script → script_ready → generating_narration → narration_ready
      → generating_images → images_ready → rendering → completed  (error em qualquer etapa)
```

## Arquitetura

Monorepo: frontend React 19 + Vite na raiz, backend Express em `backend/`.  
Proxy Vite: `/api/*` → `http://127.0.0.1:3001` (dev) ou `VITE_API_URL` (prod).

### Fluxo entre steps

```
Step1  → cria projeto (POST /api/projects)
         → ProjectContext { projectId, topic, niche, folderId, defaultVoiceId, defaultLanguage }

Step2  → gera roteiro (POST /api/projects/:id/script)
         → GPT-4o com JSON schema → script + scenes + metadados SEO → Supabase

Step3  → imagens via SSE (POST /api/projects/:id/images)
            Replicate Flux 1.1 Pro, 9:16, até 4 retries por cena, 10s entre cenas
         → narração TTS (POST /api/projects/:id/narration)
            ElevenLabs retorna MP3 + timestamps por caractere → Supabase Storage
         → end-card upload, soundtrack URL salva

Step4  → enfileira render (POST /api/projects/:id/render)
         → Remotion bundle + render (1080×1920, 30fps) via render.worker.ts
         → progresso via SSE (GET /api/projects/:id/render/status)

Step5  → exibe title/description/hashtags + thumbnail; download do vídeo
```

### Estado da aplicação

`App.tsx` gerencia 8 estados via `useState`: `DASHBOARD → TOPIC_SELECTION → SCRIPT_GENERATION → PRODUCTION_ELEMENTS → PREVIEW → EXPORT` (mais `PROJECTS_VIEW` e `AUTO_GENERATION`).  
`ProjectContext` é passado por prop para cada step — sem Redux/Context API.

### Serviços de IA

- `backend/src/services/openai.service.ts` — GPT-4o com `response_format: json_object`; 8 tipos de hook rotacionados via seed; suporte a idioma; gera também sugestões de temas e prompts de thumbnail
- `backend/src/services/flux.service.ts` — Replicate `black-forest-labs/flux-1.1-pro`; retry com `retry_after` do header 429
- `backend/src/services/elevenlabs.service.ts` — TTS multilingual v2; timestamps por caractere usados para sync de legendas
- `backend/src/services/supabase.service.ts` — client lazy com service role key

### Composição de vídeo (Remotion)

Arquivos em `backend/src/remotion/`:
- `VideoComposition.tsx` — monta cenas + áudio narração + música de fundo (volume 0.15) + end-card (5s fixos no final)
- `SceneClip.tsx` — aplica 1 dos 8 padrões de zoom/pan conforme índice da cena
- `DynamicCaption.tsx` — legendas palavra-a-palavra com `<Sequence>` sincronizadas pelos timestamps do ElevenLabs; palavra ativa: amarelo (#FFE600) + glow

**Fila de render:** `backend/src/queue/render.queue.ts` usa `p-queue` com concurrency=1; SSE via `Map<projectId, Set<callbacks>>`.

### Camada API do frontend

`src/lib/api.ts` — todas as chamadas HTTP centralizadas.  
`api.images.generateStream()` → async generator sobre SSE.  
`api.render.streamStatus()` → retorna `EventSource` nativo do browser.  
`api.music.search()` → Jamendo com fallback para Pixabay.

### Geração automática

`AutoGeneration.tsx` — executa Steps 2-4 sem intervenção do usuário, indo direto ao export.

### Defaults de pasta

Ao criar projeto dentro de uma pasta, `defaultVoiceId` e `defaultLanguage` da pasta são injetados no `ProjectContext` e aplicados automaticamente no Step 3 e na geração do roteiro.
