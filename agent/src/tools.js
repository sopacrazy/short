import supabase from './db.js';
import { fmt, daysFromNow } from './utils.js';

// Normaliza string de data para ISO com offset SP (-03:00)
// Se já tiver offset/Z, mantém. Se for só "2026-05-20" ou "2026-05-20T10:00:00", adiciona -03:00
function toSpISO(dateStr) {
  if (!dateStr) return dateStr;
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr).toISOString();
  return new Date(`${dateStr}-03:00`).toISOString();
}

// ── Definições para a API Anthropic ──────────────────────────────────────────

export const toolDefinitions = [
  {
    name: 'buscar_publicacoes',
    description: 'Busca publicações filtradas por plataforma, canal, período e status',
    input_schema: {
      type: 'object',
      properties: {
        plataforma: { type: 'string', enum: ['youtube', 'instagram', 'todas'], description: 'Plataforma a filtrar' },
        data_inicio: { type: 'string', description: 'Data/hora no fuso de São Paulo, ex: "2026-05-19T00:00:00" (sem Z, sem offset)' },
        data_fim:    { type: 'string', description: 'Data/hora no fuso de São Paulo, ex: "2026-05-19T23:59:59" (sem Z, sem offset)' },
        status:      { type: 'string', enum: ['pending', 'published', 'failed', 'todos'], description: 'Status das publicações' },
        canal_nome:  { type: 'string', description: 'Nome do canal YouTube para filtrar' },
        limite:      { type: 'number', description: 'Máximo de resultados (padrão 20)' },
      },
      required: ['plataforma'],
    },
  },
  {
    name: 'listar_canais',
    description: 'Lista todos os canais conectados (YouTube e Instagram)',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_canal',
    description: 'Retorna detalhes de um canal YouTube pelo nome',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome ou parte do nome do canal' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'atualizar_status',
    description: 'Atualiza o status de uma publicação (use somente após confirmação explícita do usuário)',
    input_schema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'ID da publicação' },
        plataforma:  { type: 'string', enum: ['youtube', 'instagram'] },
        novo_status: { type: 'string', enum: ['pending', 'published', 'failed'] },
      },
      required: ['id', 'plataforma', 'novo_status'],
    },
  },
  {
    name: 'buscar_projetos',
    description: 'Busca projetos de vídeo existentes que podem ser agendados',
    input_schema: {
      type: 'object',
      properties: {
        termo:  { type: 'string', description: 'Termo para buscar no título/tópico' },
        status: { type: 'string', description: 'Status do projeto (completed, draft, etc.)' },
        limite: { type: 'number', description: 'Máximo de resultados (padrão 10)' },
      },
    },
  },
  {
    name: 'criar_agendamento_youtube',
    description: 'Agenda um projeto existente no YouTube. Use somente após confirmação explícita do usuário com todos os dados.',
    input_schema: {
      type: 'object',
      properties: {
        project_id:     { type: 'string', description: 'ID do projeto no sistema' },
        youtube_account_id: { type: 'string', description: 'ID da conta YouTube' },
        scheduled_at:   { type: 'string', description: 'Data/hora no fuso de São Paulo, sem offset, ex: "2026-05-20T10:00:00"' },
      },
      required: ['project_id', 'youtube_account_id', 'scheduled_at'],
    },
  },
  {
    name: 'diagnosticar_banco',
    description: 'Testa a conexão com o banco e retorna contagens totais das tabelas principais. Use quando houver dúvida sobre disponibilidade dos dados.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Executores ────────────────────────────────────────────────────────────────

export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'buscar_publicacoes':    return await buscarPublicacoes(input);
      case 'listar_canais':         return await listarCanais();
      case 'buscar_canal':          return await buscarCanal(input);
      case 'diagnosticar_banco':    return await diagnosticarBanco();
      case 'atualizar_status':     return await atualizarStatus(input);
      case 'buscar_projetos':      return await buscarProjetos(input);
      case 'criar_agendamento_youtube': return await criarAgendamentoYouTube(input);
      default: return { erro: `Ferramenta desconhecida: ${name}` };
    }
  } catch (err) {
    console.error(`[tool:${name}]`, err.message);
    return { erro: `Erro ao executar ${name}: ${err.message}` };
  }
}

async function buscarPublicacoes({ plataforma, data_inicio, data_fim, status, canal_nome, limite = 20 }) {
  const results = [];
  const di = toSpISO(data_inicio);
  const df = toSpISO(data_fim);
  console.log('[buscarPublicacoes] range UTC:', di, '→', df);

  if (plataforma === 'youtube' || plataforma === 'todas') {
    let q = supabase.from('youtube_schedules').select('*, youtube_accounts(channel_name)').limit(limite);
    if (di) q = q.gte('scheduled_at', di);
    if (df) q = q.lte('scheduled_at', df);
    if (status && status !== 'todos') q = q.eq('status', status);
    if (canal_nome) {
      const { data: acc } = await supabase.from('youtube_accounts').select('id').ilike('channel_name', `%${canal_nome}%`);
      if (acc?.length) q = q.in('youtube_account_id', acc.map(a => a.id));
    }
    q = q.order('scheduled_at');
    const { data } = await q;
    results.push(...(data ?? []).map(s => ({
      id: s.id, plataforma: 'YouTube',
      canal: s.youtube_accounts?.channel_name ?? 'Canal',
      titulo: s.title ?? 'Sem título',
      horario: fmt.datetime(s.scheduled_at),
      status: s.status, url: s.youtube_url,
    })));
  }

  if (plataforma === 'instagram' || plataforma === 'todas') {
    let q = supabase.from('scheduled_reels').select('*').limit(limite);
    if (di) q = q.gte('scheduled_at', di);
    if (df) q = q.lte('scheduled_at', df);
    if (status && status !== 'todos') q = q.eq('status', status);
    q = q.order('scheduled_at');
    const { data } = await q;
    results.push(...(data ?? []).map(s => ({
      id: s.id, plataforma: 'Instagram',
      canal: `@${s.instagram_username ?? 'instagram'}`,
      titulo: (s.caption ?? '').slice(0, 80),
      horario: fmt.datetime(s.scheduled_at),
      status: s.status, url: s.instagram_url,
    })));
  }

  results.sort((a, b) => new Date(a.horario) - new Date(b.horario));
  return { total: results.length, publicacoes: results };
}

async function listarCanais() {
  const { data: yt } = await supabase.from('youtube_accounts').select('id, channel_name, channel_id, created_at');
  return {
    youtube: (yt ?? []).map(a => ({ id: a.id, nome: a.channel_name, canal_id: a.channel_id })),
    instagram: [{ plataforma: 'Instagram', nome: 'Conta Instagram conectada' }],
  };
}

async function buscarCanal({ nome }) {
  const { data } = await supabase.from('youtube_accounts').select('id, channel_name, channel_id, created_at').ilike('channel_name', `%${nome}%`);
  if (!data?.length) return { encontrado: false, mensagem: `Nenhum canal encontrado com o nome "${nome}"` };
  return { encontrado: true, canais: data.map(a => ({ id: a.id, nome: a.channel_name, canal_id: a.channel_id })) };
}

async function atualizarStatus({ id, plataforma, novo_status }) {
  const table = plataforma === 'youtube' ? 'youtube_schedules' : 'scheduled_reels';
  const { error } = await supabase.from(table).update({ status: novo_status }).eq('id', id);
  if (error) return { sucesso: false, erro: error.message };
  return { sucesso: true, mensagem: `Status atualizado para "${novo_status}"` };
}

async function buscarProjetos({ termo, status, limite = 10 }) {
  let q = supabase.from('projects').select('id, title, topic, status, thumbnail_url, created_at').limit(limite);
  if (termo) q = q.or(`title.ilike.%${termo}%,topic.ilike.%${termo}%`);
  if (status) q = q.eq('status', status);
  q = q.order('created_at', { ascending: false });
  const { data } = await q;
  return {
    total: data?.length ?? 0,
    projetos: (data ?? []).map(p => ({
      id: p.id,
      titulo: p.title ?? p.topic,
      status: p.status,
      criado_em: fmt.datetime(p.created_at),
    })),
  };
}

async function criarAgendamentoYouTube({ project_id, youtube_account_id, scheduled_at }) {
  // Busca metadados do projeto
  const { data: meta } = await supabase.from('export_metadata')
    .select('video_title, video_url, youtube_url').eq('project_id', project_id).single();

  if (!meta?.video_url) return { sucesso: false, erro: 'Projeto não tem vídeo renderizado. Finalize a produção antes de agendar.' };

  // Busca conta YouTube
  const { data: account } = await supabase.from('youtube_accounts')
    .select('channel_name').eq('id', youtube_account_id).single();

  const { data, error } = await supabase.from('youtube_schedules').insert({
    project_id,
    youtube_account_id,
    title: meta.video_title ?? 'Sem título',
    scheduled_at: toSpISO(scheduled_at),
    status: 'pending',
    youtube_url: meta.youtube_url ?? null,
  }).select().single();

  if (error) return { sucesso: false, erro: error.message };

  return {
    sucesso: true,
    mensagem: `Agendado com sucesso!`,
    agendamento: {
      id: data.id,
      titulo: data.title,
      canal: account?.channel_name ?? 'Canal',
      horario: fmt.datetime(data.scheduled_at),
    },
  };
}

async function diagnosticarBanco() {
  const [yt, ig, proj, acc] = await Promise.all([
    supabase.from('youtube_schedules').select('id, status, scheduled_at').order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('scheduled_reels').select('id, status, scheduled_at').order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('youtube_accounts').select('id, channel_name'),
  ]);

  return {
    youtube_schedules: {
      erro: yt.error?.message ?? null,
      total_retornado: yt.data?.length ?? 0,
      mais_recentes: (yt.data ?? []).map(r => ({ id: r.id, status: r.status, scheduled_at: r.scheduled_at })),
    },
    scheduled_reels: {
      erro: ig.error?.message ?? null,
      total_retornado: ig.data?.length ?? 0,
      mais_recentes: (ig.data ?? []).map(r => ({ id: r.id, status: r.status, scheduled_at: r.scheduled_at })),
    },
    projects: { erro: proj.error?.message ?? null, count: proj.count ?? 0 },
    youtube_accounts: { erro: acc.error?.message ?? null, canais: (acc.data ?? []).map(a => a.channel_name) },
  };
}
