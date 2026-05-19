# Moodclip AI Agent — Telegram

Agente de IA conversacional para gerenciar publicações do Moodclip via Telegram.  
Powered by **Claude (Anthropic)** + **grammy** + **Supabase**.

## Funcionalidades

- **Chat em linguagem natural** — pergunte sobre agendamentos, canais, status de publicações
- **Ferramentas em tempo real** — busca, lista canais, atualiza status, cria agendamentos YouTube
- **Histórico de conversa** — contexto de até 20 trocas por usuário
- **Notificações automáticas** via cron:
  - ✅ Publicações concluídas (a cada 2 min)
  - 📅 Resumo diário às 07:00
  - ⚠️ Aviso de slot vazio 1h antes do horário
  - 📋 Preview das publicações 15min antes

## Instalação

```bash
cd agent
npm install
cp .env.example .env
# edite o .env com suas credenciais
node src/index.js
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `TELEGRAM_BOT_TOKEN` | Token do bot (obtido no @BotFather) |
| `TELEGRAM_CHAT_ID` | ID do chat/grupo que receberá as notificações |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Chave anon/service do Supabase |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (Claude) |

## Ferramentas disponíveis para o agente

| Ferramenta | Descrição |
|------------|-----------|
| `buscar_publicacoes` | Filtra por plataforma, canal, período, status |
| `listar_canais` | Lista todos os canais conectados |
| `buscar_canal` | Detalhes de um canal YouTube pelo nome |
| `atualizar_status` | Muda status de uma publicação |
| `buscar_projetos` | Busca projetos por título/tópico |
| `criar_agendamento_youtube` | Agenda um projeto no YouTube |

## Migração necessária no Supabase

Execute `supabase/bot_migration.sql` antes de rodar o agente:

```sql
ALTER TABLE youtube_schedules ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_reels   ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
```
