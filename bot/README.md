# Moodclip Telegram Bot

Bot de notificações do sistema de agendamento Moodclip.

## Instalação

```bash
cd bot
npm install
```

## Configuração

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

Edite `.env`:
```
TELEGRAM_BOT_TOKEN=   # token do BotFather
TELEGRAM_CHAT_ID=     # ID do chat/grupo que receberá as mensagens
SUPABASE_URL=         # mesmo do projeto principal
SUPABASE_SERVICE_KEY= # mesmo do projeto principal
```

### Como obter o TELEGRAM_BOT_TOKEN
1. Abra o Telegram e fale com [@BotFather](https://t.me/BotFather)
2. Envie `/newbot` e siga as instruções
3. Copie o token gerado

### Como obter o TELEGRAM_CHAT_ID
1. Adicione o bot ao grupo (ou inicie conversa direta)
2. Envie qualquer mensagem
3. Acesse: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Copie o valor de `"chat": { "id": ... }`

## Migration do banco

Execute no Supabase SQL Editor:

```sql
-- arquivo: supabase/bot_migration.sql
ALTER TABLE youtube_schedules ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_reels   ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE;
```

## Rodar

```bash
npm start

# Ou com hot-reload durante desenvolvimento:
npm run dev
```

## Comandos disponíveis

| Comando   | Descrição                                      |
|-----------|------------------------------------------------|
| `/start`  | Apresentação e lista de comandos               |
| `/hoje`   | Lista todos os agendamentos do dia com status  |
| `/status` | Resumo: pendentes, publicados e falhos do dia  |

## Notificações automáticas

| Horário (SP) | Evento                                        |
|--------------|-----------------------------------------------|
| 08:00        | Resumo diário matinal                         |
| 11:45        | Prévia do que será publicado às 12:00         |
| 12:00        | Alerta se não há nada agendado para este slot |
| 16:45        | Prévia do que será publicado às 17:00         |
| 17:00        | Alerta se não há nada agendado para este slot |
| a cada 2min  | Detecta publicações concluídas e notifica     |

## Rodar em produção com PM2

```bash
npm install -g pm2
pm2 start src/index.js --name moodclip-bot
pm2 save
pm2 startup
```
