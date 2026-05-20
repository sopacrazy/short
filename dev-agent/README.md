# Dev Agent

Agente de desenvolvimento sênior autônomo via Telegram. Recebe tarefas, lê/edita arquivos do projeto, roda builds e faz deploy com confirmação explícita.

## Instalação

```bash
cd dev-agent
npm install
```

## Configuração do .env

Copie o template e preencha:

```bash
cp .env.example .env
```

```env
TELEGRAM_BOT_TOKEN=seu_token_do_botfather
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_USER_IDS=1296219489
PROJECT_DIR=/var/www/clipai-backend
PM2_SERVER_NAME=moodclip-server
```

**Como obter o TELEGRAM_BOT_TOKEN:** fale com @BotFather no Telegram → /newbot.

**Como obter seu USER_ID:** fale com @userinfobot no Telegram.

## Iniciar com PM2

```bash
pm2 start src/index.js --name dev-agent
pm2 save
```

## Iniciar em desenvolvimento

```bash
npm run dev
```

## Comandos no Telegram

| Comando | Descrição |
|---------|-----------|
| `/start` | Exibe boas-vindas e lista de comandos |
| `/clear` | Limpa o histórico da conversa |
| `/status` | Mostra status dos processos PM2 |

## Exemplos de tarefas

Basta escrever em linguagem natural:

```
Adiciona um novo endpoint GET /api/health no servidor que retorna { ok: true }
```

```
O build do TypeScript está falhando. Verifique o erro e corrija.
```

```
Leia o arquivo server/services/youtube.service.ts e me explica como funciona o upload
```

```
Adiciona log de tempo de resposta no middleware de autenticação
```

```
Faça deploy das últimas alterações (npm run build + pm2 restart)
```

## Segurança

- Apenas usuários em `ALLOWED_USER_IDS` podem usar o bot
- Arquivos só podem ser lidos/escritos dentro de `PROJECT_DIR`
- Comandos de terminal têm whitelist: `npm install`, `npm run build`, `npm run lint`, `npx tsc`, `pm2 restart`, `pm2 status`, `pm2 logs`, `git status`, `git diff`, `git log`
- Backup automático (`.bak.<timestamp>`) antes de sobrescrever qualquer arquivo
- Toda ação é registrada em `agent.log`
- Deploy e restarts sempre pedem confirmação explícita (responda `sim` ou `não`)

## Estrutura

```
dev-agent/
├── src/
│   ├── index.js        # Bot Telegram + loop de confirmação
│   ├── agent.js        # Loop agêntico (max 20 iterações)
│   ├── tools.js        # Implementação das ferramentas
│   ├── toolSchemas.js  # JSON schemas para API Anthropic
│   ├── auth.js         # Whitelist de usuários
│   └── logger.js       # Audit log → agent.log
├── .env.example
├── package.json
└── README.md
```
