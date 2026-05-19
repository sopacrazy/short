import supabase from './db.js';
import { formatTime, getHourWindow, getTodayWindow } from './utils.js';

// Polling: detecta publicações novas (status published + notificado=false) e notifica
export async function checkPublished(bot, chatId) {
  try {
    // Instagram Reels publicados
    const { data: reels } = await supabase
      .from('scheduled_reels')
      .select('*')
      .eq('status', 'published')
      .eq('notificado', false);

    for (const reel of reels ?? []) {
      const time = formatTime(reel.published_at ?? reel.scheduled_at);
      let msg = `✅ *Publicado no Instagram* às ${time}\n📝 ${(reel.caption ?? 'Sem legenda').slice(0, 80)}`;
      if (reel.instagram_url) msg += `\n🔗 ${reel.instagram_url}`;
      await bot.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      await supabase.from('scheduled_reels').update({ notificado: true }).eq('id', reel.id);
    }

    // YouTube agendados/publicados
    const { data: ytSchedules } = await supabase
      .from('youtube_schedules')
      .select('*, youtube_accounts(channel_name)')
      .eq('status', 'published')
      .eq('notificado', false);

    for (const s of ytSchedules ?? []) {
      const canal = s.youtube_accounts?.channel_name ?? 'YouTube';
      const time  = formatTime(s.scheduled_at);
      let msg = `✅ *Publicado no YouTube* — canal *${canal}* às ${time}\n📝 ${(s.title ?? 'Sem título').slice(0, 80)}`;
      if (s.youtube_url) msg += `\n🔗 ${s.youtube_url}`;
      await bot.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      await supabase.from('youtube_schedules').update({ notificado: true }).eq('id', s.id);
    }
  } catch (err) {
    console.error('[checkPublished]', err.message);
  }
}

// Verifica se existe algum agendamento pendente na hora especificada; alerta se vazio
export async function checkEmptySlot(bot, chatId, hour) {
  const { start, end } = getHourWindow(hour);
  const h = String(hour).padStart(2, '0');

  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('id').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
      supabase.from('scheduled_reels').select('id').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
    ]);

    const total = (ytRes.data?.length ?? 0) + (igRes.data?.length ?? 0);
    if (total === 0) {
      await bot.api.sendMessage(chatId, `⚠️ Atenção: não há publicação agendada para as *${h}:00* de hoje.`, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error(`[checkEmptySlot ${h}h]`, err.message);
  }
}

// Resumo preventivo: lista o que será publicado na próxima hora cheia
export async function sendPreviewSummary(bot, chatId, hour) {
  const { start, end } = getHourWindow(hour);
  const h = String(hour).padStart(2, '0');

  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
      supabase.from('scheduled_reels').select('*').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
    ]);

    const yt = ytRes.data ?? [];
    const ig = igRes.data ?? [];
    const total = yt.length + ig.length;

    if (total === 0) {
      await bot.api.sendMessage(chatId, `⚠️ Resumo ${h}:00 — Nenhuma publicação agendada para esta hora.`);
      return;
    }

    const lines = [`📋 *Resumo — publicações às ${h}:00:*\n`];
    for (const s of yt) {
      const canal = s.youtube_accounts?.channel_name ?? 'Canal';
      lines.push(`▶️ YouTube _(${canal})_: ${s.title ?? 'Sem título'}`);
    }
    for (const s of ig) {
      lines.push(`📸 Instagram: ${(s.caption ?? 'Sem legenda').slice(0, 60)}`);
    }

    await bot.api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`[sendPreviewSummary ${h}h]`, err.message);
  }
}

// Resumo diário completo (chamado ao iniciar o bot ou sob demanda)
export async function sendDailySummary(bot, chatId) {
  const { start, end } = getTodayWindow();

  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()).order('scheduled_at'),
      supabase.from('scheduled_reels').select('*').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()).order('scheduled_at'),
    ]);

    const yt = ytRes.data ?? [];
    const ig = igRes.data ?? [];
    const total = yt.length + ig.length;

    if (total === 0) {
      await bot.api.sendMessage(chatId, '📅 Bom dia! Nenhuma publicação agendada para hoje.');
      return;
    }

    const lines = [`📅 *Bom dia! ${total} publicação${total > 1 ? 'ões' : ''} hoje:*\n`];
    for (const s of yt) {
      lines.push(`▶️ \`${formatTime(s.scheduled_at)}\` ${s.title ?? ''} _(${s.youtube_accounts?.channel_name ?? 'YT'})_`);
    }
    for (const s of ig) {
      lines.push(`📸 \`${formatTime(s.scheduled_at)}\` ${(s.caption ?? '').slice(0, 50)}`);
    }

    await bot.api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[sendDailySummary]', err.message);
  }
}
