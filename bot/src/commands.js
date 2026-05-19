import supabase from './db.js';
import { formatTime, formatDate, statusIcon, getTodayWindow } from './utils.js';

export async function handleHoje(ctx) {
  const { start, end } = getTodayWindow();
  const today = formatDate(new Date().toISOString());

  try {
    const [ytRes, igRes] = await Promise.all([
      supabase
        .from('youtube_schedules')
        .select('*, youtube_accounts(channel_name)')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('scheduled_reels')
        .select('*')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true }),
    ]);

    const yt = ytRes.data ?? [];
    const ig = igRes.data ?? [];
    const total = yt.length + ig.length;

    const lines = [`📅 *Agendamentos de hoje — ${today}*\n`];

    if (total === 0) {
      lines.push('Nenhuma publicação agendada para hoje.');
    } else {
      if (yt.length > 0) {
        lines.push('*YouTube:*');
        for (const s of yt) {
          const canal = s.youtube_accounts?.channel_name ?? 'Canal';
          lines.push(`${statusIcon(s.status)} \`${formatTime(s.scheduled_at)}\` — ${s.title ?? 'Sem título'} _(${canal})_`);
        }
      }
      if (ig.length > 0) {
        if (yt.length > 0) lines.push('');
        lines.push('*Instagram:*');
        for (const s of ig) {
          const caption = (s.caption ?? 'Sem legenda').slice(0, 60);
          lines.push(`${statusIcon(s.status)} \`${formatTime(s.scheduled_at)}\` — ${caption}`);
        }
      }
      lines.push(`\n_Total: ${total} publicação${total > 1 ? 'ões' : ''}_`);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[/hoje]', err);
    await ctx.reply('❌ Erro ao buscar agendamentos.');
  }
}

export async function handleStatus(ctx) {
  const { start, end } = getTodayWindow();
  const today = formatDate(new Date().toISOString());

  try {
    const [ytRes, igRes] = await Promise.all([
      supabase.from('youtube_schedules').select('status').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
      supabase.from('scheduled_reels').select('status').gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString()),
    ]);

    const all = [...(ytRes.data ?? []), ...(igRes.data ?? [])];
    const pending   = all.filter(s => s.status === 'pending').length;
    const published = all.filter(s => s.status === 'published').length;
    const failed    = all.filter(s => s.status === 'failed').length;

    await ctx.reply(
      [
        `📊 *Status do dia — ${today}*`,
        '',
        `Total: *${all.length}*`,
        `⏳ Pendentes: *${pending}*`,
        `✅ Publicados: *${published}*`,
        `❌ Falhos: *${failed}*`,
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[/status]', err);
    await ctx.reply('❌ Erro ao buscar status.');
  }
}

export async function handleStart(ctx) {
  await ctx.reply(
    '👋 *Bot Moodclip ativo!*\n\n' +
    '/hoje — lista agendamentos de hoje\n' +
    '/status — resumo do dia (pendentes, publicados, falhos)',
    { parse_mode: 'Markdown' }
  );
}
