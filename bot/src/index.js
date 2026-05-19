import { Bot } from 'grammy';
import cron from 'node-cron';
import dotenv from 'dotenv';
dotenv.config();

import { handleHoje, handleStatus, handleStart } from './commands.js';
import { checkPublished, checkEmptySlot, sendPreviewSummary, sendDailySummary } from './notifier.js';

const token  = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error('❌ TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórios no .env');
  process.exit(1);
}

const bot = new Bot(token);

// ── Comandos ──────────────────────────────────────────────────────────────────
bot.command('start', handleStart);
bot.command('hoje',  handleHoje);
bot.command('status', handleStatus);

// ── Error handler ─────────────────────────────────────────────────────────────
bot.catch(err => console.error('[Bot Error]', err.message));

// ── Cron jobs (horário de São Paulo) ──────────────────────────────────────────
const TZ = { timezone: 'America/Sao_Paulo' };

// 08:00 — resumo diário matinal
cron.schedule('0 8 * * *',  () => sendDailySummary(bot, chatId), TZ);

// 11:45 — resumo preventivo para as 12:00
cron.schedule('45 11 * * *', () => sendPreviewSummary(bot, chatId, 12), TZ);

// 12:00 — alerta se horário vazio
cron.schedule('0 12 * * *',  () => checkEmptySlot(bot, chatId, 12), TZ);

// 16:45 — resumo preventivo para as 17:00
cron.schedule('45 16 * * *', () => sendPreviewSummary(bot, chatId, 17), TZ);

// 17:00 — alerta se horário vazio
cron.schedule('0 17 * * *',  () => checkEmptySlot(bot, chatId, 17), TZ);

// A cada 2 minutos — detecta publicações novas e envia notificação
cron.schedule('*/2 * * * *', () => checkPublished(bot, chatId));

// ── Inicialização ─────────────────────────────────────────────────────────────
bot.start();
console.log('🤖 Bot Moodclip iniciado! Aguardando mensagens...');

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.once('SIGINT',  () => { console.log('Encerrando...'); bot.stop('SIGINT');  });
process.once('SIGTERM', () => { console.log('Encerrando...'); bot.stop('SIGTERM'); });
