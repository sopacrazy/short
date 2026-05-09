# Resumo e Documentação do Projeto: AstraShorts

Este documento serve como um guia de referência rápido sobre a arquitetura, stack tecnológico e funcionamento do **AstraShorts**, uma aplicação para geração automatizada de vídeos curtos (Shorts/Reels/TikTok) utilizando IA.

## 🏗️ Stack Tecnológico

O projeto é um **Monorepo** dividido em duas partes principais (Frontend e Backend), gerenciadas via NPM Workspaces.

### Frontend
- **Framework:** React 19 + Vite.
- **Estilização:** Tailwind CSS (versão 4) + componentização customizada.
- **Ícones & Animações:** `lucide-react` para ícones e `motion` (Framer Motion) para animações.
- **Roteamento & Estado:** Gerenciamento de estado local no `App.tsx` (sem uso de Redux). O fluxo de telas (Dashboard -> Etapas de Criação) é controlado pelo estado `currentStep`.
- **Comunicação de API:** Centralizada no arquivo `src/lib/api.ts`.

### Backend
- **Framework:** Node.js com Express (escrito em TypeScript).
- **Video Rendering:** Remotion (`@remotion/renderer` e `@remotion/bundler`) para renderizar os vídeos programaticamente.
- **Banco de Dados & Storage:** Supabase (PostgreSQL para dados tabulares como projetos, scripts, etc., e Storage para armazenar áudios e possivelmente os vídeos renderizados).
- **Processamento Assíncrono:** `p-queue` para controle de filas de requisições.

### 🤖 Integrações de IA (Serviços Externos)
1. **OpenAI (GPT-4o):** Utilizado para gerar ideias de tópicos, roteiros, hooks, CTAs (Call to Actions) e metadados SEO (títulos, descrições, hashtags).
2. **Replicate (Flux 1.1 Pro):** Utilizado para geração das imagens (proporção 9:16) baseadas nas cenas do roteiro.
3. **ElevenLabs:** Utilizado para Text-to-Speech (TTS). Transforma o roteiro em locução (áudio MP3) que é salva no storage do Supabase.

---

## ⚙️ Variáveis de Ambiente (`.env`)
O arquivo `.env` deve ficar na raiz do projeto e **não deve** ser versionado. As seguintes variáveis são utilizadas:

**Obrigatórias:**
- `OPENAI_API_KEY`: Chave de API da OpenAI (geração de texto).
- `SUPABASE_URL`: URL do projeto no Supabase.
- `SUPABASE_KEY`: Chave de API do Supabase (Service Role / Anon Key).

**Recomendadas (O aplicativo perde funcionalidades sem elas):**
- `ELEVENLABS_API_KEY`: Chave de API do ElevenLabs (geração de voz).
- `REPLICATE_API_TOKEN`: Chave de API do Replicate (geração de imagens com Flux).
- `PORT`: Porta do servidor Backend (padrão `3001`).

---

## 🗺️ Fluxo de Funcionamento (Pipelines)

O processo de criação de um vídeo no app é linear e separado por **Steps** (Etapas), controlados pelo componente principal `App.tsx`:

1. **Dashboard / Projects:** Interface inicial para visualização de projetos e criação de novas pastas.
2. **Step 1 (Topic Selection):** O usuário define um tema/nicho. (Chamada para `POST /api/projects` para salvar no banco).
3. **Step 2 (Script Generation):** O backend consome a API da OpenAI para estruturar um roteiro completo de shorts (dividido em cenas, com texto falado e prompts para imagens). Salva as informações no Supabase.
4. **Step 3 (Production Elements - Imagens e Narração):**
   - **Imagens:** O backend solicita a geração das imagens via API do Replicate (Flux 1.1 Pro) para cada cena gerada.
   - **Áudio:** O backend consome o ElevenLabs para gerar o arquivo MP3 da locução e salva no Supabase Storage.
5. **Step 4 (Preview):** Apresentação das imagens e do roteiro para validação e possíveis edições manuais.
6. **Step 5 (Export/Renderização):** Integração com o Remotion no backend para renderizar e compilar todos os elementos (áudio, imagens, tempos e textos) em um vídeo MP4 final.

Também existe um fluxo de **Auto Generation**, que agrupa as etapas do roteiro e da produção num processo único.

---

## 💻 Comandos e Scripts Úteis

O projeto facilita a execução através de scripts definidos no `package.json` principal:

- `npm run dev`: Executa simultaneamente o Frontend (porta dinâmica, ex: 5173) e o Backend (porta 3001) através do `concurrently`. O Vite cuida do proxy das chamadas `/api/*` para o backend automaticamente.
- `npm run dev:frontend`: Inicia apenas o frontend.
- `npm run dev:backend`: Inicia apenas o backend usando `tsx watch` (hot-reload habilitado).
- `npm run build`: Faz o build de produção do frontend (`dist`).
- `npm run lint`: Checa a tipagem do frontend (usando `tsc --noEmit`).

---

## 📁 Estrutura de Diretórios Importantes

```text
c:\SistemaAdr\short\
 ├── .env                 # Variáveis de ambiente
 ├── package.json         # Dependências do frontend e Workspace
 ├── backend/             # Diretório do servidor Node.js/Express
 │    ├── src/
 │    │    ├── index.ts           # Ponto de entrada do backend
 │    │    ├── routes/            # Endpoints (projetos, imagens, scripts, etc.)
 │    │    ├── services/          # Conexão c/ OpenAI, Replicate, Supabase, ElevenLabs
 │    │    └── remotion/          # Composições e lógica de vídeo (React Remotion)
 │    └── package.json    # Dependências do backend (Express, Remotion, Supabase, etc)
 ├── src/                 # Código do Frontend (React + Vite)
 │    ├── App.tsx         # Controlador mestre do fluxo e state de telas
 │    ├── lib/api.ts      # Cliente das APIs (Chamadas Axios/Fetch para o backend)
 │    └── components/     # UI components (Steps de criação, Dashboard, etc.)
 └── supabase/            # Configurações/Schema do banco de dados (schema.sql)
```

> **Dica de Manutenção:** Ao fazer mudanças na lógica de rotas/APIs, atualize primeiro em `backend/src/routes/` e lembre-se de refletir no client frontend em `src/lib/api.ts`.
