import supabase from './db.js';
import { fmt, getHourWindow, getTodayWindow } from './utils.js';

export async function checkPublished(bot, chatId) {
  try {
    const { data: reels } = await supabase
      .from('scheduled_reels').select('*').eq('status', 'published').eq('notificado', false);

    for (const r of reels ?? []) {
      let msg = `✅ *Publicado no Instagram* às ${fmt.time(r.published_at ?? r.scheduled_at)}\n📝 ${(r.caption ?? '').slice(0, 80)}`;
      if (r.instagram_url) msg += `\n🔗 ${r.instagram_url}`;
      await bot.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      await supabase.from('scheduled_reels').update({ notificado: true }).eq('id', r.id);
    }

    const { data: yt } = await supabase
      .from('youtube_schedules').select('*, youtube_accounts(channel_name)').eq('status', 'published').eq('notificado', false);

    for (const s of yt ?? []) {
      const canal = s.youtube_accounts?.channel_name ?? 'YouTube';
      let msg = `✅ *Publicado no YouTube* — *${canal}* às ${fmt.time(s.scheduled_at)}\n📝 ${(s.title ?? '').slice(0, 80)}`;
      if (s.youtube_url) msg += `\n🔗 ${s.youtube_url}`;
      await bot.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      await supabase.from('youtube_schedules').update({ notificado: true }).eq('id', s.id);
    }
  } catch (err) {
    console.error('[checkPublished]', err.message);
  }
}

export async function checkEmptySlot(bot, chatId, hour) {
  const { start, end } = getHourWindow(hour);
  const h = String(hour).padStart(2, '0');
  try {
    const [yt, ig] = await Promise.all([
      supabase.from('youtube_schedules').select('id').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
      supabase.from('scheduled_reels').select('id').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
    ]);
    const total = (yt.data?.length ?? 0) + (ig.data?.length ?? 0);
    if (total === 0) {
      await bot.api.sendMessage(chatId, `⚠️ Atenção: não há publicação agendada para as *${h}:00* de hoje.`, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    console.error(`[checkEmptySlot ${hour}h]`, err.message);
  }
}

export async function sendPreviewSummary(bot, chatId, hour) {
  const { start, end } = getHourWindow(hour);
  const h = String(hour).padStart(2, '0');
  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
      supabase.from('scheduled_reels').select('*').eq('status', 'pending').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
    ]);
    const yt = ytRes.data ?? [], ig = igRes.data ?? [];
    if (yt.length + ig.length === 0) {
      await bot.api.sendMessage(chatId, `⚠️ Resumo ${h}:00 — Nenhuma publicação agendada para esta hora.`);
      return;
    }
    const lines = [`📋 *Publicações às ${h}:00:*`];
    yt.forEach(s => lines.push(`▶️ _(${s.youtube_accounts?.channel_name ?? 'YT'})_ ${s.title ?? ''}`));
    ig.forEach(s => lines.push(`📸 _(Instagram)_ ${(s.caption ?? '').slice(0, 60)}`));
    await bot.api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`[sendPreviewSummary ${hour}h]`, err.message);
  }
}

export async function sendDailySummary(bot, chatId) {
  const { start, end } = getTodayWindow();
  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()).order('scheduled_at'),
      supabase.from('scheduled_reels').select('*').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()).order('scheduled_at'),
    ]);
    const yt = ytRes.data ?? [], ig = igRes.data ?? [];
    const total = yt.length + ig.length;
    if (total === 0) { await bot.api.sendMessage(chatId, '📅 Bom dia! Nenhuma publicação agendada para hoje.'); return; }
    const lines = [`📅 *Bom dia! ${total} publicação${total > 1 ? 'ões' : ''} hoje:*`];
    yt.forEach(s => lines.push(`▶️ \`${fmt.time(s.scheduled_at)}\` ${s.title ?? ''} _(${s.youtube_accounts?.channel_name ?? 'YT'})_`));
    ig.forEach(s => lines.push(`📸 \`${fmt.time(s.scheduled_at)}\` ${(s.caption ?? '').slice(0, 50)}`));
    await bot.api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[sendDailySummary]', err.message);
  }
}
