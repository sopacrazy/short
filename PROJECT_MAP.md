# Mapa de Projeto: Moodclip (React + Express TypeScript)

Documentação para navegação rápida e modificação de código por IA.
Última atualização: 2026-05-19

---

## 1. ESTRUTURA GERAL

- Frontend: React + TypeScript + Vite → `src/`
- Backend: Express + TypeScript → `server/` (compila para `dist-server/`)
- Agent Telegram: Node.js + Claude → `agent/src/`
- Database: Supabase (PostgreSQL)
- Video Rendering: Remotion (`server/remotion/`)
- Build frontend: `npm run build:frontend` → `dist/`
- Build backend: `npm run build:server` → `dist-server/`
- PM2: `moodclip-server` (backend), `moodclip-agent` (agent)

---

## 2. FLUXO DE APLICAÇÃO (App.tsx)

**Arquivo:** `src/App.tsx`

### Estados (AppStep):
```
DASHBOARD → PROJECTS → TOPIC_SELECTION → SCRIPT_GENERATION
→ PRODUCTION_ELEMENTS → PREVIEW → EXPORT
→ VIRAL_PHRASES → CURIOSITY_POST → CURIOSITY_GALLERY
→ SCHEDULES → AUTO_GENERATION
```

---

## 3. COMPONENTES DO FRONTEND (`src/components/`)

### Step1Topic.tsx
- Seleção de tópico/nicho para novo projeto
- 10 categorias pré-definidas (linhas 14-25)
- `fetchThemes` (linhas 46-54): sugestões via OpenAI
- `handleStart` (linhas 66-81): cria projeto
- API: `api.topics.suggestions`, `api.projects.create`, `api.projects.moveToFolder`

### Step2Script.tsx
- Geração e edição do roteiro
- Geração automática na primeira renderização (linhas 23-43)
- `handleRegenerate` (linhas 46-68): regenera evitando hook repetido
- API: `api.scripts.generate`, `api.scripts.update`

### Step3Production.tsx
- Narração, imagens e áudio
- Seleção de voz (linhas 38, 70-71)
- `handleRegenerateAllImages` (linhas 92-103): gera imagens em stream
- Upload de imagem customizada (linhas 114-129)
- `handleFinalize` (linhas 147-150): gera narração
- API: `api.narration.voices/generate`, `api.images.generateStream/regenerate/upload`

### Step4Preview.tsx
- Preview do vídeo
- API: `api.render.streamStatus` (SSE)

### Step5Export.tsx
- Renderização e publicação
- API: `api.render.start`, `api.youtube.upload`, `api.instagram.upload`

### Dashboard.tsx
- Últimos 5 projetos (linhas 104-116)
- Exclusão com confirmação (linhas 120-139)
- API: `api.projects.list`, `api.projects.delete`

### ProjectsView.tsx
- Galeria completa com pastas
- Listagem de pastas (linhas 19-59)
- **Modal de criar pasta (linhas 518-542)** ← campo name + emoji + color + defaults
- Editar pasta (linhas 80-100)
- API: `api.folders.list/create/update/delete`, `api.projects.moveToFolder`

### Agendamentos.tsx
- Central de agendamentos YouTube + Instagram
- Tabs: Pendentes / Publicados
- Filtros: plataforma, canal, data
- `ChannelDropdown` custom (linhas 56-113)
- API: `api.youtube.schedules/deleteSchedule`, `api.instagram.getSchedules/deleteSchedule/updateSchedule`

### Sidebar.tsx
- Navegação lateral (linhas 25-150)
- Gerenciar contas YouTube (linhas 90-130)
- Conectar/desconectar Instagram (linhas 135-150)

### ViralPhrases.tsx
- Posts de frases virais
- 5 categorias + taescrito.ai (linhas 15-22)
- `handleGenerate` (linhas 111-137), `handleGenerateImage` (linhas 150+)
- Templates: classic, minimal, bold, elegant, handwritten, magazine
- API: `api.viralPhrases.generate/uploadImage/schedule/getScheduled/cancelScheduled`

### CuriosityPost.tsx
- Criador de posts de curiosidades
- 10 categorias, 7 idiomas (linhas 29-50)
- Composição avançada de imagem
- API: `api.curiosityPost.generate/generateImage/generateAdvancedImage`, `api.curiosityPosts.create/update`

### CuriosityGallery.tsx
- Galeria de posts de curiosidades
- Filtro por status (draft, scheduled, published, failed)
- Modal de agendamento (linhas 40-96)
- API: `api.curiosityPosts.list/update`

### FolderContextBanner.tsx
- Banner com nome/emoji da pasta atual

### SettingsModal.tsx
- Configurações do usuário

### Auth.tsx
- Login com Supabase

### AutoGeneration.tsx
- Fluxo automático completo (Steps 2-4 sem intervenção)

---

## 4. API CLIENT (`src/lib/api.ts`)

```
api.projects   → list, get, create, delete, moveToFolder, uploadEndCard, generateThumbnail
api.scripts    → generate, update
api.narration  → generate, voices (cache 10min)
api.images     → generateStream (SSE), regenerate, upload, generateAll
api.render     → start, streamStatus (SSE/EventSource)
api.folders    → list, get, create, update, delete
api.topics     → suggestions
api.music      → search, save
api.youtube    → status, getAuthUrl, accounts, removeAccount, schedules, deleteSchedule, upload
api.instagram  → status, getAuthUrl, disconnect, upload, uploadPhoto, scheduleReel,
                 getSchedules, deleteSchedule, updateSchedule
api.viralPhrases → generate, uploadImage, schedule, getScheduled, cancelScheduled
api.curiosityPost → generate, generateImage, suggestions, uploadComposed, generateAdvancedImage
api.curiosityPosts → list, create, update, delete
api.curiosityFolders → list, create, update, delete
api.translate
api.health
```

---

## 5. BACKEND — ROTAS (`server/routes/`)

### projects.ts
```
GET  /api/projects                    → listar (filtro: ?folder_id)
GET  /api/projects/:id                → { project, script, scenes[], narration, metadata }
POST /api/projects                    → criar { topic, niche }
PATCH /api/projects/:id/folder        → { folder_id }
PATCH /api/projects/:id/status        → { status }
POST /api/projects/:id/endcard        → { imageBase64, mimeType }
POST /api/projects/:id/thumbnail      → gera thumbnail via Flux
```

### scripts.ts
```
POST  /api/projects/:id/script  → gerar { topic, niche, voice_tone, narration_speed, language }
PATCH /api/projects/:id/script  → editar { title, hook, body, cta }
```

### narration.ts
```
POST /api/projects/:id/narration → gerar { voice_id, speed }
```

### images.ts
```
POST /api/projects/:id/images              → gerar todas (SSE) { visual_style }
POST /api/projects/:id/images/:sceneId     → regenerar cena
POST /api/projects/:id/images/:sceneId/upload → upload customizado { imageBase64, mimeType }
```

### render.ts
```
POST /api/projects/:id/render         → enfileirar renderização
GET  /api/projects/:id/render/status  → SSE de progresso
GET  /api/render/queue                → status da fila
```

### folders.ts
```
GET    /api/folders      → listar
GET    /api/folders/:id  → detalhes
POST   /api/folders      → criar { name, emoji, color, default_voice_id, default_language, default_youtube_tags }
PATCH  /api/folders/:id  → atualizar
DELETE /api/folders/:id  → excluir
```

### youtube.ts
```
GET    /api/youtube/status           → verificar conexão
GET    /api/youtube/auth             → { url } OAuth
GET    /api/youtube/callback         → handle OAuth
GET    /api/youtube/accounts         → listar contas
DELETE /api/youtube/accounts/:id     → desconectar conta
GET    /api/youtube/schedules        → listar (filtro: ?account_id)
DELETE /api/youtube/schedules/:id    → cancelar
POST   /api/youtube/upload           → { projectId, scheduledAt }
```

### instagram.ts
```
GET    /api/instagram/status         → verificar conexão
GET    /api/instagram/auth           → { url } OAuth
POST   /api/instagram/callback       → handle OAuth
DELETE /api/instagram/disconnect     → desconectar
POST   /api/instagram/upload         → { projectId, caption }
POST   /api/instagram/upload-photo   → { imageUrl, caption }
POST   /api/instagram/schedule-reel  → { projectId, caption, scheduledAt }
GET    /api/instagram/schedules      → listar
DELETE /api/instagram/schedules/:id  → cancelar
PATCH  /api/instagram/schedules/:id  → { scheduledAt }
```

### viral-phrases.ts
```
POST /api/viral-phrases/generate       → { query, category }
POST /api/viral-phrases/upload-image   → { imageBase64 }
POST /api/viral-phrases/schedule       → { imageUrl, caption, scheduledAt }
GET  /api/viral-phrases/scheduled      → listar
DELETE /api/viral-phrases/scheduled/:id → cancelar
```

### curiosity-post.ts
```
POST /api/curiosity-post/generate        → { curiosity, language }
POST /api/curiosity-post/image           → { prompt }
POST /api/curiosity-post/suggestions     → { query, count }
POST /api/curiosity-post/upload-composed → { imageBase64 }
POST /api/curiosity-post/advanced-image  → { title_white, title_yellow, description, image_prompt }
```

### curiosity-posts.ts
```
GET    /api/curiosity-posts      → listar (filtro: ?status)
POST   /api/curiosity-posts      → criar
PATCH  /api/curiosity-posts/:id  → atualizar
DELETE /api/curiosity-posts/:id  → excluir
```

### curiosity-folders.ts
```
GET    /api/curiosity-folders      → listar
POST   /api/curiosity-folders      → { name, emoji, language, logo_data }
PATCH  /api/curiosity-folders/:id  → atualizar
DELETE /api/curiosity-folders/:id  → excluir
```

---

## 6. SERVIÇOS DO BACKEND (`server/services/`)

### openai.service.ts
- `generateScript(topic, niche, ...)` → roteiro + cenas + metadata
- `generateTopicSuggestions(query, count)` → sugestões de temas
- `generateThumbnailPrompt(title, niche)` → prompt de thumbnail

### elevenlabs.service.ts
- `listVoices(apiKey)` → vozes disponíveis
- `generateNarration(projectId, voiceId, speed, apiKey)` → MP3 + timestamps

### flux.service.ts
- `generateImage(prompt, style, apiKey)` → URL da imagem via Replicate

### youtube.service.ts
- `getAuthUrl(userId)` → URL OAuth
- `exchangeCodeAndStore(code, userId)` → salva tokens
- `listAccounts(userId)` → contas conectadas
- `removeAccount(accountId, userId)`
- `uploadToYouTube(videoUrl, title, description, hashtags, language, folderTags, scheduledAt, accountId, userId)`

### instagram.service.ts
- `getAuthUrl(userId)` → URL OAuth
- `exchangeCodeAndStore(code, userId)` → token 60 dias
- `getInstagramStatus(userId)` → { connected, username }
- `disconnect(userId)`
- `uploadPhoto(imageUrl, caption, userId)`
- `uploadReel(videoUrl, caption, userId)`
- `scheduleReel(videoUrl, caption, scheduledAt, userId)`

### scheduler.service.ts
- `startScheduler()` → cron 60s, publica posts vencidos
- Processa: curiosity_posts, viral_scheduled_posts, scheduled_reels

### supabase.service.ts
- `getSupabase()` → client com service_role key

### settings.service.ts
- `getUserAIKeys(userId)` → { openai_key, elevenlabs_key, replicate_token }

---

## 7. AGENT TELEGRAM (`agent/src/`)

### index.js
- Grammy bot
- Crons: check publicações 2min, resumo diário 07:00, alertas 1h antes, preview 15min antes

### agent.js
- Model: `claude-sonnet-4-6`, max 5 loops, histórico 40 msgs
- `processMessage(userId, text)` → resposta com contexto do banco

### tools.js
- Ferramentas: listar/criar/atualizar/deletar agendamentos no Supabase
- `toSpISO(dateStr)` → normaliza timezone para São Paulo (-03:00)

### context.js
- Busca canais, publicações hoje, pendentes 7 dias, recentes

### notifier.js
- `checkPublished`, `sendDailySummary`, `sendPreviewSummary`, `checkEmptySlot`

### db.js
- Supabase client com `realtime: { transport: ws }` (Node.js 20)

---

## 8. BANCO DE DADOS (Supabase)

```
projects          → id, user_id, topic, niche, title, status, folder_id, thumbnail_url
scripts           → project_id, title, hook, body, cta, voice_tone, narration_speed
scenes            → project_id, scene_number, description, image_prompt, image_url
narrations        → project_id, voice_id, audio_url, duration, timestamps (JSONB)
export_metadata   → project_id, video_title, description, hashtags, video_url, youtube_url
folders           → id, user_id, name, emoji, color, default_voice_id, default_language,
                    default_youtube_tags, youtube_account_id
youtube_accounts  → id, user_id, channel_name, channel_id, access_token, refresh_token
youtube_schedules → id, project_id, user_id, youtube_account_id, title, scheduled_at,
                    youtube_video_id, youtube_url, status (pending/published/failed)
instagram_tokens  → user_id, access_token, instagram_user_id, username, expires_at
scheduled_reels   → id, user_id, video_url, caption, scheduled_at, status, instagram_url
viral_scheduled_posts → id, user_id, image_url, caption, scheduled_at, status
curiosity_posts   → id, user_id, folder_id, title_white, title_yellow, description, cta,
                    caption, hashtags, image_url, status, scheduled_at, published_at
curiosity_folders → id, user_id, name, emoji, language, logo_data
```

**Status do projeto:**
`draft → generating_script → script_ready → generating_images → generating_narration → rendering → completed` (ou `error`)

**Status de posts:**
`draft → scheduled → published` (ou `failed`)

---

## 9. FLUXOS PRINCIPAIS

### Criar vídeo manual
Step1 → `projects.create` → Step2 → `scripts.generate` → Step3 → `images.generateStream` + `narration.generate` → Step4 preview → Step5 → `render.start` → `youtube.upload`

### Auto generation
Step1 → `AutoGeneration.tsx` executa steps 2-4 automaticamente → EXPORT

### Post viral
`viralPhrases.generate` → `images.generate` → `viralPhrases.schedule` → scheduler publica no Instagram

### Curiosity post
`curiosityPost.generate` → `generateAdvancedImage` → `curiosityPosts.create` → agenda → scheduler publica

---

## 10. ONDE FAZER MODIFICAÇÕES COMUNS

| O que mudar | Arquivo | Linhas aprox. |
|-------------|---------|---------------|
| Modal criar pasta (campos) | `src/components/ProjectsView.tsx` | 518-542 |
| Card de projeto no dashboard | `src/components/Dashboard.tsx` | 144-212 |
| Filtros de agendamentos | `src/components/Agendamentos.tsx` | 56-113 |
| Campos da pasta (defaults) | `src/components/ProjectsView.tsx` | 80-113 |
| Navegação lateral | `src/components/Sidebar.tsx` | 25-150 |
| Prompt de geração de roteiro | `server/services/openai.service.ts` | 57-150 |
| Geração de imagens (Flux) | `server/services/flux.service.ts` | — |
| Upload YouTube | `server/services/youtube.service.ts` | — |
| Publicação Instagram | `server/services/instagram.service.ts` | — |
| Composição de vídeo | `server/remotion/VideoComposition.tsx` | — |
| Legendas do vídeo | `server/remotion/DynamicCaption.tsx` | — |
| Fila de render | `server/queue/render.queue.ts` | — |
| Tipos globais frontend | `src/types.ts` | — |
| Todas as chamadas HTTP | `src/lib/api.ts` | — |
