import { Bot } from 'grammy';
import 'dotenv/config';
import { isAuthorized } from './auth.js';
import { runAgent } from './agent.js';
import { logger } from './logger.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN é obrigatório');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY é obrigatório');
  process.exit(1);
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// conversationHistory por usuário (em memória — reinicia com o bot)
const conversationHistories = new Map();
// pendingConfirmation: userId → { resolve }
const pendingConfirmations = new Map();
// usuários aguardando confirmação
const awaitingConfirmation = new Set();

bot.command('start', (ctx) => {
  const userId = ctx.from?.id;
  if (!isAuthorized(userId)) {
    return ctx.reply('🚫 Acesso não autorizado.');
  }
  ctx.reply(
    '👨‍💻 *Dev Agent online*\n\nEnvie uma tarefa de desenvolvimento e eu vou analisá-la e executá-la.\n\n' +
    'Comandos:\n/start — esta mensagem\n/clear — limpa histórico\n/status — status do servidor',
    { parse_mode: 'Markdown' },
  );
});

bot.command('clear', (ctx) => {
  const userId = ctx.from?.id;
  if (!isAuthorized(userId)) return;
  conversationHistories.delete(userId);
  ctx.reply('🗑️ Histórico limpo.');
});

bot.command('status', async (ctx) => {
  const userId = ctx.from?.id;
  if (!isAuthorized(userId)) return;
  ctx.reply('🔍 Verificando PM2...');
  try {
    const { execa } = await import('execa');
    const result = await execa('pm2', ['status'], { timeout: 10_000 });
    await ctx.reply(`\`\`\`\n${result.stdout.slice(0, 3000)}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(`❌ Erro ao consultar PM2: ${err.message}`);
  }
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message.text;

  if (!isAuthorized(userId)) {
    logger.warn(userId, 'UNAUTHORIZED_MESSAGE', text.slice(0, 60));
    return ctx.reply('🚫 Acesso não autorizado.');
  }

  // Resposta a confirmação pendente
  if (awaitingConfirmation.has(userId)) {
    const pending = pendingConfirmations.get(userId);
    if (pending) {
      const lower = text.toLowerCase().trim();
      const confirmed = lower === 'sim' || lower === 's' || lower === 'yes' || lower === 'y';
      awaitingConfirmation.delete(userId);
      pendingConfirmations.delete(userId);
      pending.resolve(confirmed);
      return;
    }
  }

  await ctx.replyWithChatAction('typing');

  const history = conversationHistories.get(userId) ?? [];

  const safeSend = async (msg, opts = {}) => {
    try {
      await ctx.reply(msg, { parse_mode: 'Markdown', ...opts });
    } catch {
      // Fallback sem markdown se a formatação quebrar
      await ctx.reply(msg.replace(/[*_`[\]]/g, ''), opts);
    }
  };

  const onSendMessage = async (msg) => {
    await safeSend(msg);
    await ctx.replyWithChatAction('typing');
  };

  const onAskConfirmation = (question) => {
    return new Promise(async (resolve) => {
      awaitingConfirmation.add(userId);
      pendingConfirmations.set(userId, { resolve });
      await ctx.reply(
        `❓ *Confirmação necessária*\n\n${question}\n\nResponda *sim* ou *não*.`,
        { parse_mode: 'Markdown' },
      );
    });
  };

  try {
    const { reply, updatedHistory } = await runAgent({
      userId,
      userMessage: text,
      conversationHistory: history,
      onSendMessage,
      onAskConfirmation,
    });

    // Mantém últimas 10 mensagens para não explodir contexto
    const trimmed = updatedHistory.slice(-10);
    conversationHistories.set(userId, trimmed);

    await safeSend(reply);
  } catch (err) {
    logger.error(userId, 'AGENT_CRASH', err.message);
    await ctx.reply(`❌ Erro interno: ${err.message}`);
  }
});

bot.catch((err) => {
  console.error('[BotError]', err.message);
});

bot.start();
console.log('🤖 Dev Agent iniciado.');
