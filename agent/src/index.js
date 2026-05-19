import { Bot } from 'grammy';
import cron from 'node-cron';
import 'dotenv/config';
import { processMessage } from './agent.js';
import {
  checkPublished,
  checkEmptySlot,
  sendPreviewSummary,
  sendDailySummary,
} from './notifier.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN não configurado');
if (!CHAT_ID) throw new Error('TELEGRAM_CHAT_ID não configurado');

const bot = new Bot(TOKEN);

// ── Mensagens de texto → agente IA ───────────────────────────────────────────

bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message.text;

  if (!userId) return;

  try {
    await ctx.replyWithChatAction('typing');
    const reply = await processMessage(userId, text);
    await ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[bot:message]', err.message);
    await ctx.reply('Desculpe, tive um problema ao processar sua mensagem. Tente novamente.');
  }
});

// ── Crons de notificação ──────────────────────────────────────────────────────

// Verifica publicações a cada 2 min
cron.schedule('*/2 * * * *', () => checkPublished(bot, CHAT_ID), { timezone: 'America/Sao_Paulo' });

// Resumo diário às 07:00
cron.schedule('0 7 * * *', () => sendDailySummary(bot, CHAT_ID), { timezone: 'America/Sao_Paulo' });

// Aviso de slot vazio 1h antes (para horários 8h–22h)
[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].forEach(hour => {
  cron.schedule(`0 ${hour - 1} * * *`, () => checkEmptySlot(bot, CHAT_ID, hour), { timezone: 'America/Sao_Paulo' });
});

// Preview 15 min antes (para horários 8h–22h)
[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].forEach(hour => {
  cron.schedule(`45 ${hour - 1} * * *`, () => sendPreviewSummary(bot, CHAT_ID, hour), { timezone: 'America/Sao_Paulo' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function checkDbConnection() {
  const { data, error } = await (await import('./db.js')).default
    .from('youtube_schedules').select('id, scheduled_at, status').limit(3);
  if (error) {
    console.error('[agent] ❌ Erro de acesso ao banco:', error.message);
    console.error('       → Verifique se SUPABASE_SERVICE_KEY é a service_role key (não a anon key)');
  } else {
    console.log(`[agent] ✅ Banco OK — ${data.length} registro(s) encontrado(s) em youtube_schedules (sem filtro)`);
    if (data.length) console.log('[agent]   Exemplo:', JSON.stringify(data[0]));
  }
}

bot.start({
  onStart: async () => {
    console.log('[agent] Bot IA iniciado');
    await checkDbConnection();
  },
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
