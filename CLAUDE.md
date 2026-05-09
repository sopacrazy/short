# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Rodar frontend (porta dinâmica) + backend (3001) juntos
npm run dev

# Separados
npm run dev:frontend
npm run dev:backend

npm run build    # build frontend → ./dist
npm run lint     # type-check frontend (tsc --noEmit)

# Dentro de backend/
cd backend && npx tsc --noEmit   # type-check backend
```

## Variáveis de ambiente

Todas as chaves ficam em `.env` na raiz (o backend carrega esse arquivo automaticamente). Nunca commitar `.env`.

Serviços obrigatórios: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.  
Opcionais (funcionalidades degradam sem elas): `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`.

## Banco de dados

Supabase. Schema em `supabase/schema.sql` — executar no SQL Editor do painel.  
Tabelas: `projects`, `scripts`, `scenes`, `narrations`, `export_metadata`.  
Storage bucket `audio` (público) necessário para uploads de narração.

## Arquitetura

Monorepo: frontend React 19 + Vite na raiz, backend Express em `backend/`.  
Proxy do Vite: `/api/*` → `localhost:3001` (configurado em `vite.config.ts`).

**Fluxo de dados entre steps:**

```
Step1 → cria projeto no Supabase via POST /api/projects
        → passa { projectId, topic } para frente via App.tsx state

Step2 → POST /api/projects/:id/script
        → GPT-4o gera roteiro, hook, CTA, cenas, hashtags
        → salva tudo no Supabase e retorna ao frontend

Step3 → POST /api/projects/:id/images
        → Replicate (Flux 1.1 Pro) gera imagens 9:16 por cena
        → URLs salvas em scenes.image_url no Supabase

Step4 → preview visual (sem renderização real ainda)

Step5 → lê metadata do Supabase e exibe título/descrição/hashtags gerados pelo GPT
```

**Serviços de IA:**
- `backend/src/services/openai.service.ts` — GPT-4o, gera roteiro + metadados SEO em JSON
- `backend/src/services/flux.service.ts` — Replicate, modelo `black-forest-labs/flux-1.1-pro`, imagens 9:16
- `backend/src/services/elevenlabs.service.ts` — TTS multilingual v2, áudio MP3 → Supabase Storage
- `backend/src/services/supabase.service.ts` — client lazy (inicializado na 1ª chamada)

**Camada de API do frontend:** `src/lib/api.ts` — todas as chamadas HTTP centralizadas aqui.

**Estado da aplicação:** gerenciado em `App.tsx` via `useState`. O objeto `ProjectContext` (`{ projectId, topic, niche }`) é passado por prop para cada step. Sem Redux/Context.
