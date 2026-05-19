import supabase from './db.js';
import { getTodayWindow, daysFromNow, fmt } from './utils.js';

function normalizeYT(s) {
  return {
    id: s.id,
    plataforma: 'YouTube',
    canal: s.youtube_accounts?.channel_name ?? 'Canal',
    titulo: s.title ?? 'Sem título',
    horario: fmt.datetime(s.scheduled_at),
    status: s.status,
    url: s.youtube_url ?? null,
  };
}

function normalizeIG(s) {
  return {
    id: s.id,
    plataforma: 'Instagram',
    canal: `@${s.instagram_username ?? 'instagram'}`,
    titulo: (s.caption ?? 'Sem legenda').slice(0, 80),
    horario: fmt.datetime(s.scheduled_at),
    status: s.status,
    url: s.instagram_url ?? null,
  };
}

export async function fetchContext() {
  const { start: todayStart, end: todayEnd } = getTodayWindow();
  const weekEnd = daysFromNow(7);
  const now = new Date().toISOString();

  const [ytToday, igToday, ytPending, igPending, ytRecent, igRecent, ytAccounts] = await Promise.allSettled([
    // Hoje
    supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)')
      .gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at'),
    supabase.from('scheduled_reels').select('*')
      .gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at'),

    // Próximos 7 dias pendentes
    supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)')
      .eq('status', 'pending').gt('scheduled_at', now).lte('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at').limit(30),
    supabase.from('scheduled_reels').select('*')
      .eq('status', 'pending').gt('scheduled_at', now).lte('scheduled_at', weekEnd.toISOString())
      .order('scheduled_at').limit(30),

    // Últimas 10 publicadas
    supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)')
      .eq('status', 'published').order('scheduled_at', { ascending: false }).limit(10),
    supabase.from('scheduled_reels').select('*')
      .eq('status', 'published').order('scheduled_at', { ascending: false }).limit(10),

    // Canais YouTube
    supabase.from('youtube_accounts').select('id, channel_name, channel_id, created_at'),
  ]);

  const get = r => r.status === 'fulfilled' ? (r.value.data ?? []) : [];

  const hoje = [
    ...get(ytToday).map(normalizeYT),
    ...get(igToday).map(normalizeIG),
  ].sort((a, b) => new Date(a.horario) - new Date(b.horario));

  const pendentes = [
    ...get(ytPending).map(normalizeYT),
    ...get(igPending).map(normalizeIG),
  ].sort((a, b) => new Date(a.horario) - new Date(b.horario));

  const recentes = [
    ...get(ytRecent).map(normalizeYT),
    ...get(igRecent).map(normalizeIG),
  ].sort((a, b) => new Date(b.horario) - new Date(a.horario)).slice(0, 10);

  const canais = [
    ...get(ytAccounts).map(a => ({ id: a.id, plataforma: 'YouTube', nome: a.channel_name, canal_id: a.channel_id })),
    { id: 'instagram', plataforma: 'Instagram', nome: 'Instagram', canal_id: null },
  ];

  return { hoje, pendentes, recentes, canais };
}
