# Resumo e Documentação do Projeto: AstraShorts

Este documento serve como um guia de referência rápido sobre a arquitetura, stack tecnológico e funcionamento do **AstraShorts**, uma aplicação para geração automatizada de vídeos curtos (Shorts/Reels/TikTok) utilizando IA.

## 🏗️ Stack Tecnológico

O projeto é um **Monorepo** dividido em duas partes principais (Frontend e Backend), gerenciadas via NPM Workspaces.

### Frontend
- **Framework:** React 19 + Vite.
- **Estilização:** Tailwind CSS (versão 4) + componentização customizada (Glassmorphism, Dark Mode).
- **Ícones & Animações:** `lucide-react` para ícones e `motion` (Framer Motion) para animações e micro-interações.
- **Roteamento & Estado:** Gerenciamento de estado linear no `App.tsx`. O fluxo de telas é controlado pelo estado `currentStep`.
- **Comunicação de API:** Centralizada em `src/lib/api.ts`, utilizando `fetch` para REST e `EventSource` / Async Generators para SSE (Server-Sent Events).

### Backend
- **Framework:** Node.js + Express (TypeScript).
- **Video Rendering:** Remotion (`@remotion/renderer`) executado em workers assíncronos (`render.worker.ts`).
- **Banco de Dados & Storage:** Supabase (Postgres + Storage). Buckets: `audio` (narrações, trilhas, end-cards) e `videos` (MP4 finais).
- **Processamento em Fila:** `p-queue` para gerenciar renderizações sequenciais, evitando sobrecarga de CPU.
- **Real-time:** SSE (Server-Sent Events) para transmitir progresso de geração de imagens e renderização de vídeo sem polling.

### Autenticação & SaaS (Multi-tenancy)
- **Supabase Auth:** Gerenciamento de usuários, login social e sessões.
- **Isolamento de Dados:** Row Level Security (RLS) garante que cada usuário acesse apenas seus próprios projetos e pastas.
- **AI Keys Privadas:** Cada usuário pode configurar suas próprias chaves (OpenAI, Replicate, ElevenLabs) no painel de configurações, com fallback para as chaves do sistema se permitido.
- **Middleware de Backend:** Validação de JWT em todas as rotas sensíveis para garantir que o `user_id` da requisição corresponda ao dono dos dados.

### 🤖 Integrações de IA (Serviços Externos)
1. **OpenAI (GPT-4o):** Geração de temas, roteiros estruturados (JSON), hooks persuasivos e metadados SEO.
2. **Replicate (Flux 1.1 Pro):** Geração de imagens realistas em proporção 9:16 com lógica de retry automático para limites de taxa (429).
3. **ElevenLabs:** Text-to-Speech (TTS) com suporte a múltiplos idiomas e geração de timestamps precisos (por caractere) para sincronização de legendas.

---

## ⚙️ Variáveis de Ambiente (`.env`)

**Obrigatórias:**
- `OPENAI_API_KEY`: Geração de texto e metadados.
- `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_SERVICE_KEY`: Persistência e storage.
- `ELEVENLABS_API_KEY`: Narração profissional.
- `REPLICATE_API_TOKEN`: Geração de imagens Flux.

**Opcionais:**
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`: Necessários para publicação direta.
- `PORT`: Porta do servidor (padrão `3001`).

---

## 🗺️ Fluxo de Funcionamento (Pipelines)

1. **Dashboard & Pastas:** Organização de projetos em pastas com configurações padrão (Idioma, Voz, Tags do YouTube).
2. **Step 1 (Tópico):** Definição do tema. O app sugere nichos e ganchos iniciais via IA.
3. **Step 2 (Roteiro):** Geração do script dividido em cenas. O usuário pode editar o texto antes de produzir.
4. **Step 3 (Produção):**
   - **Imagens (SSE):** Geração paralela via Flux com feedback em tempo real cena a cena.
   - **Narração:** Geração do MP3 + extração de timestamps para legendas dinâmicas.
   - **Trilha Sonora:** Busca via Jamendo API com fallback para biblioteca local (`suspense.mp3`).
5. **Step 4 (Preview & Ajustes):** Visualização de imagens, escolha de música de fundo e upload de "End-card" (Cartão final).
6. **Step 5 (Render & Export):**
   - O Remotion compila imagens, áudio e legendas (amarelo #FFE600 com glow).
   - O vídeo final é salvo no Supabase.
   - **YouTube Integration:** Upload direto ou agendado para o YouTube Shorts após a renderização.

---

## 📁 Estrutura de Diretórios

```text
short/
 ├── backend/
 │    ├── src/
 │    │    ├── routes/        # Projetos, Imagens, Scripts, Render, YouTube
 │    │    ├── services/      # OpenAI, Flux, ElevenLabs, Supabase, YouTube
 │    │    ├── queue/         # Fila de renderização p-queue
 │    │    ├── workers/       # Processamento pesado (Render Worker)
 │    │    └── remotion/      # Composições React (VideoComposition, DynamicCaption)
 ├── src/                     # Frontend React
 │    ├── lib/api.ts          # Cliente API centralizado
 │    ├── components/         # Views de Steps (Step1-5) e Dashboard
 │    └── types/              # Interfaces compartilhadas
 └── supabase/                # SQL Schemas e Migrations
```

---

## 🛠️ Manutenção e Erros Frequentes

- **Erro de Tipagem (TS):** Ao adicionar campos em pastas ou projetos, certifique-se de atualizar `ApiFolder` e `ApiProject` em `src/lib/api.ts`.
- **Limites de API:** O Replicate (Flux) tem limites estritos; o backend implementa um delay de 10s entre cenas para contas com saldo baixo.
- **Sync de Legendas:** Se as legendas parecerem desalinhadas, verifique se os timestamps do ElevenLabs estão sendo extraídos corretamente em `narration.ts`.
- **Renderização Lenta:** A renderização depende de CPU. Em ambientes cloud limitados, o tempo de render pode exceder o timeout do HTTP; use sempre o SSE status para monitorar.
