import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Instagram, Youtube, RefreshCw, Trash2, Pencil, Check, X, Film, Filter, ChevronDown } from 'lucide-react';
import { api, type YouTubeSchedule } from '@/src/lib/api';

type ScheduleStatus = 'pending' | 'published' | 'failed';
type Tab      = 'pending' | 'done';
type Platform = 'all' | 'youtube' | 'instagram';

interface ScheduledReel {
  id: string;
  video_url: string;
  caption: string;
  scheduled_at: string;
  status: ScheduleStatus;
  instagram_url?: string;
  error_message?: string;
  published_at?: string;
  created_at: string;
  instagram_username?: string | null;
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Agendado',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',   icon: <Clock       className="w-3 h-3" /> },
  published: { label: 'Publicado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:    { label: 'Falhou',    color: 'text-red-400 bg-red-500/10 border-red-500/20',             icon: <XCircle     className="w-3 h-3" /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isoToDateInput(iso: string) {
  return iso.slice(0, 10);
}
function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `em ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)  return `em ${h}h ${m}min`;
  return `em ${m}min`;
}

// ── Dropdown customizado ──────────────────────────────────────────────────────

interface DropdownOption { value: string; label: string; icon?: React.ReactNode }

function ChannelDropdown({ options, value, onChange, placeholder = 'Todos os canais' }: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 h-10 pl-3.5 pr-3 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
          open ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200'
        }`}>
        {selected?.icon}
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 left-0 z-50 min-w-[180px] rounded-2xl bg-[#111] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
            <div className="p-1.5 space-y-0.5">
              <button onClick={() => { onChange('all'); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all text-left ${
                  value === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <Filter className="w-3 h-3 shrink-0" />
                {placeholder}
              </button>
              {options.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all text-left ${
                    value === opt.value ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}>
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  {opt.label}
                  {value === opt.value && <Check className="w-3 h-3 ml-auto shrink-0 text-white" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Agendamentos() {
  const [reels, setReels]             = useState<ScheduledReel[]>([]);
  const [ytSchedules, setYtSchedules] = useState<YouTubeSchedule[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [tab, setTab]                 = useState<Tab>('pending');

  // Filtros
  const [platform,     setPlatform]     = useState<Platform>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterDate,   setFilterDate]   = useState<string>('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [instaData, ytData] = await Promise.all([api.instagram.getSchedules(), api.youtube.schedules()]);
      setReels(instaData);
      setYtSchedules(ytData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar agendamentos');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Canais únicos do YouTube para o dropdown
  const ytChannels = useMemo(() => {
    const map = new Map<string, string>();
    ytSchedules.forEach(s => {
      if (s.youtube_account_id && s.youtube_accounts?.channel_name)
        map.set(s.youtube_account_id, s.youtube_accounts.channel_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [ytSchedules]);

  // Aplica filtros
  const applyFilters = (ytList: YouTubeSchedule[], reelList: ScheduledReel[]) => {
    let yt = ytList;
    let ig = reelList;

    if (platform === 'youtube')   ig = [];
    if (platform === 'instagram') yt = [];

    if (filterChannel !== 'all') {
      yt = yt.filter(s => s.youtube_account_id === filterChannel);
      ig = ig.filter(r => (r.instagram_username ?? '') === filterChannel);
    }

    if (filterDate) {
      yt = yt.filter(s => isoToDateInput(s.scheduled_at) === filterDate);
      ig = ig.filter(r => isoToDateInput(r.scheduled_at) === filterDate);
    }

    return { yt, ig };
  };

  const pendingYt    = ytSchedules.filter(s => s.status === 'pending');
  const doneYt       = ytSchedules.filter(s => s.status !== 'pending');
  const pendingReels = reels.filter(r => r.status === 'pending');
  const doneReels    = reels.filter(r => r.status !== 'pending');

  const { yt: filteredPendingYt, ig: filteredPendingIg } = applyFilters(pendingYt, pendingReels);
  const { yt: filteredDoneYt,    ig: filteredDoneIg }    = applyFilters(doneYt, doneReels);

  const totalPending = pendingYt.length + pendingReels.length;
  const totalDone    = doneYt.length + doneReels.length;
  const isEmpty      = totalPending === 0 && totalDone === 0;

  const filteredCount = tab === 'pending'
    ? filteredPendingYt.length + filteredPendingIg.length
    : filteredDoneYt.length + filteredDoneIg.length;

  const hasFilters = platform !== 'all' || filterChannel !== 'all' || filterDate !== '';

  // Canais Instagram únicos
  const igChannels = useMemo(() => {
    const names = new Set<string>();
    reels.forEach(r => { if (r.instagram_username) names.add(r.instagram_username); });
    return Array.from(names);
  }, [reels]);

  const clearFilters = () => { setPlatform('all'); setFilterChannel('all'); setFilterDate(''); };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-white">Agendamentos</h1>
          <p className="text-gray-500 text-sm">
            {totalPending > 0 ? `${totalPending} publicação${totalPending > 1 ? 'ões' : ''} pendente${totalPending > 1 ? 's' : ''}` : 'Nenhum agendamento pendente'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-gray-700" />
          </div>
          <p className="text-gray-600 text-sm font-medium">Nenhum agendamento ainda.</p>
          <p className="text-gray-700 text-xs">Agende um vídeo na tela de Exportar de qualquer projeto.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Tabs + Filtros */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
              {([
                { key: 'pending', label: 'Pendentes', count: totalPending },
                { key: 'done',    label: 'Publicados', count: totalDone },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    tab === t.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {t.label}
                  {t.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tab === t.key ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Separador */}
            <div className="w-px h-6 bg-white/5 hidden sm:block" />

            {/* Plataforma */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
              {([
                { key: 'all',       label: 'Todos',     icon: <Filter className="w-3 h-3" /> },
                { key: 'youtube',   label: 'YouTube',   icon: <Youtube className="w-3 h-3 text-red-500" /> },
                { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-3 h-3 text-pink-400" /> },
              ] as const).map(p => (
                <button key={p.key} onClick={() => { setPlatform(p.key); setFilterChannel('all'); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                    platform === p.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* Canal */}
            {platform !== 'instagram' && ytChannels.length > 0 && (
              <ChannelDropdown
                value={filterChannel}
                onChange={setFilterChannel}
                placeholder="Todos os canais"
                options={[
                  ...ytChannels.map(c => ({
                    value: c.id,
                    label: c.name,
                    icon: <Youtube className="w-3 h-3 text-red-500" />,
                  })),
                  ...(platform !== 'youtube' ? igChannels.map(name => ({
                    value: name,
                    label: `@${name}`,
                    icon: <Instagram className="w-3 h-3 text-pink-400" />,
                  })) : []),
                ]}
              />
            )}
            {platform === 'instagram' && igChannels.length > 1 && (
              <ChannelDropdown
                value={filterChannel}
                onChange={setFilterChannel}
                placeholder="Todas as contas"
                options={igChannels.map(name => ({
                  value: name,
                  label: `@${name}`,
                  icon: <Instagram className="w-3 h-3 text-pink-400" />,
                }))}
              />
            )}

            {/* Data */}
            <div className="relative">
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="h-10 pl-3 pr-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-gray-400 outline-none hover:border-white/10 transition-all cursor-pointer focus:border-white/20 [color-scheme:dark]" />
            </div>

            {/* Limpar filtros */}
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-all hover:bg-white/5">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>

          {/* Resultado filtrado */}
          <AnimatePresence mode="wait">
            {tab === 'pending' ? (
              <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {filteredCount === 0 ? (
                  <p className="text-gray-600 text-sm py-12 text-center">Nenhum resultado{hasFilters ? ' para os filtros selecionados' : ''}.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {filteredPendingYt.map((s, i) => (
                        <YoutubeCard key={s.id} schedule={s} index={i}
                          onDelete={id => setYtSchedules(prev => prev.filter(x => x.id !== id))} />
                      ))}
                      {filteredPendingIg.map((r, i) => (
                        <InstagramCard key={r.id} reel={r} index={i}
                          onDelete={id => setReels(prev => prev.filter(x => x.id !== id))}
                          onUpdate={(id, at) => setReels(prev => prev.map(x => x.id === id ? { ...x, scheduled_at: at } : x))} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {filteredCount === 0 ? (
                  <p className="text-gray-600 text-sm py-12 text-center">Nenhum resultado{hasFilters ? ' para os filtros selecionados' : ''}.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {filteredDoneYt.map((s, i) => (
                        <YoutubeCard key={s.id} schedule={s} index={i}
                          onDelete={id => setYtSchedules(prev => prev.filter(x => x.id !== id))} />
                      ))}
                      {filteredDoneIg.map((r, i) => (
                        <InstagramCard key={r.id} reel={r} index={i}
                          onDelete={id => setReels(prev => prev.filter(x => x.id !== id))}
                          onUpdate={(id, at) => setReels(prev => prev.map(x => x.id === id ? { ...x, scheduled_at: at } : x))} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}

// ── Card YouTube ──────────────────────────────────────────────────────────────

function YoutubeCard({ schedule, index, onDelete }: { schedule: YouTubeSchedule; index: number; onDelete: (id: string) => void }) {
  const [isDeleting, setIsDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const eta         = schedule.status === 'pending' ? timeUntil(schedule.scheduled_at) : null;
  const cfg         = STATUS_CONFIG[schedule.status as ScheduleStatus] ?? STATUS_CONFIG.pending;
  const channelName = schedule.youtube_accounts?.channel_name ?? 'YouTube Shorts';

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.youtube.deleteSchedule(schedule.id); onDelete(schedule.id); }
    catch (err: any) { console.error(err); }
    finally { setIsDeleting(false); setConfirmDelete(false); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="flex flex-col rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all overflow-hidden">

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-red-600/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0">
            <Youtube className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest truncate">{channelName}</span>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide shrink-0 ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-3">
        <p className="text-sm text-white font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
          {schedule.title ?? 'Sem título'}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Calendar className="w-3 h-3 shrink-0" />
            {formatShortDate(schedule.scheduled_at)}
            {eta && <span className="text-purple-400 font-medium ml-1">{eta}</span>}
          </div>
          {(schedule.video_url || schedule.youtube_url) && (
            <a href={schedule.youtube_url ?? schedule.video_url!} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-white transition-colors">
              <Film className="w-3 h-3" /> Ver vídeo
            </a>
          )}
        </div>
      </div>

      {schedule.status === 'pending' && (
        <div className="px-4 pb-4">
          <AnimatePresence>
            {confirmDelete ? (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={handleDelete} disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remover
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 text-xs font-bold transition-all">
                  Manter
                </button>
              </motion.div>
            ) : (
              <motion.button key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-600 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                <Trash2 className="w-3 h-3" /> Cancelar agendamento
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── Card Instagram ────────────────────────────────────────────────────────────

function InstagramCard({ reel, index, onDelete, onUpdate }: {
  reel: ScheduledReel; index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, scheduledAt: string) => void;
}) {
  const cfg       = STATUS_CONFIG[reel.status] ?? STATUS_CONFIG.pending;
  const eta       = reel.status === 'pending' ? timeUntil(reel.scheduled_at) : null;
  const isPending = reel.status === 'pending';
  const [isDeleting, setIsDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing]         = useState(false);
  const [editValue, setEditValue]         = useState(toLocalInput(reel.scheduled_at));
  const [isSaving, setIsSaving]           = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try { await api.instagram.deleteSchedule(reel.id); onDelete(reel.id); }
    catch (err: any) { console.error(err); }
    finally { setIsDeleting(false); setConfirmDelete(false); }
  };

  const handleSaveEdit = async () => {
    if (!editValue) return;
    setIsSaving(true);
    try {
      const isoDate = new Date(editValue).toISOString();
      await api.instagram.updateSchedule(reel.id, isoDate);
      onUpdate(reel.id, isoDate);
      setIsEditing(false);
    } catch (err: any) { console.error(err); }
    finally { setIsSaving(false); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="flex flex-col rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all overflow-hidden">

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-pink-600/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center shrink-0">
            <Instagram className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-bold text-pink-400 uppercase tracking-widest truncate">
            {reel.instagram_username ? `@${reel.instagram_username}` : 'Instagram Reels'}
          </span>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide shrink-0 ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-3">
        <p className="text-sm text-white font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
          {reel.caption || 'Sem legenda'}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Calendar className="w-3 h-3 shrink-0" />
            {formatShortDate(reel.scheduled_at)}
            {eta && <span className="text-purple-400 font-medium ml-1">{eta}</span>}
            {reel.status === 'published' && reel.published_at && (
              <span className="text-gray-600 ml-1">· {formatDate(reel.published_at)}</span>
            )}
          </div>
          {(reel.video_url || reel.instagram_url) && (
            <a href={reel.instagram_url ?? reel.video_url!} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-white transition-colors">
              <Film className="w-3 h-3" /> Ver vídeo
            </a>
          )}
          {reel.status === 'failed' && reel.error_message && (
            <p className="text-[11px] text-red-400">{reel.error_message}</p>
          )}
        </div>
      </div>

      {isPending && (
        <div className="px-4 pb-4 space-y-2">
          <AnimatePresence>
            {isEditing ? (
              <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <input type="datetime-local" value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="flex-1 h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
                <button onClick={handleSaveEdit} disabled={isSaving}
                  className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-all disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setIsEditing(false); setEditValue(toLocalInput(reel.scheduled_at)); }}
                  className="w-9 h-9 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : confirmDelete ? (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={handleDelete} disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Remover
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 text-xs font-bold transition-all">
                  Manter
                </button>
              </motion.div>
            ) : (
              <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={() => setIsEditing(true)}
                  className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-500 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                  <Pencil className="w-3 h-3" /> Reagendar
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-600 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3 h-3" /> Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
