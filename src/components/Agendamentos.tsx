import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Instagram, Youtube, ExternalLink, RefreshCw, Trash2, Pencil, Check, X } from 'lucide-react';
import { api, type YouTubeSchedule } from '@/src/lib/api';

type ScheduleStatus = 'pending' | 'published' | 'failed';

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
  pending: { label: 'Agendado', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <Clock className="w-3 h-3" /> },
  published: { label: 'Publicado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: 'Falhou', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <XCircle className="w-3 h-3" /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `em ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `em ${h}h ${m}min`;
  return `em ${m}min`;
}

export default function Agendamentos() {
  const [reels, setReels] = useState<ScheduledReel[]>([]);
  const [ytSchedules, setYtSchedules] = useState<YouTubeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [instaData, ytData] = await Promise.all([
        api.instagram.getSchedules(),
        api.youtube.schedules(),
      ]);
      setReels(instaData);
      setYtSchedules(ytData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pendingReels = reels.filter(r => r.status === 'pending');
  const doneReels = reels.filter(r => r.status !== 'pending');
  const pendingYt = ytSchedules.filter(s => s.status === 'pending');
  const doneYt = ytSchedules.filter(s => s.status !== 'pending');

  // Agrupar YouTube por canal
  const ytByChannel = pendingYt.reduce((acc, s) => {
    const key = s.youtube_account_id ?? 'unknown';
    const name = s.youtube_accounts?.channel_name ?? 'Canal sem nome';
    if (!acc[key]) acc[key] = { name, schedules: [] };
    acc[key].schedules.push(s);
    return acc;
  }, {} as Record<string, { name: string; schedules: YouTubeSchedule[] }>);

  const totalPending = pendingReels.length + pendingYt.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-white">Agendamentos</h1>
          <p className="text-gray-500 text-sm">
            {totalPending > 0 ? `${totalPending} publicação${totalPending > 1 ? 'ões' : ''} agendada${totalPending > 1 ? 's' : ''}` : 'Nenhum agendamento pendente'}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>
      ) : totalPending === 0 && doneReels.length === 0 && doneYt.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-gray-700" />
          </div>
          <p className="text-gray-600 text-sm font-medium">Nenhum agendamento ainda.</p>
          <p className="text-gray-700 text-xs">Agende um vídeo na tela de Exportar de qualquer projeto.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Pendentes */}
          {(pendingReels.length > 0 || pendingYt.length > 0) && (
            <section className="space-y-6">
              <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] px-1">Pendentes</h2>

              {/* YouTube por canal */}
              {Object.entries(ytByChannel).map(([accountId, { name, schedules }]) => (
                <div key={accountId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{name}</span>
                  </div>
                  <AnimatePresence>
                    {schedules.map((s, i) => (
                      <YoutubeScheduleCard
                        key={s.id}
                        schedule={s}
                        index={i}
                        onDelete={id => setYtSchedules(prev => prev.filter(x => x.id !== id))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}

              {/* Instagram */}
              {pendingReels.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-500" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Instagram Reels</span>
                  </div>
                  <AnimatePresence>
                    {pendingReels.map((reel, i) => (
                      <ScheduleCard key={reel.id} reel={reel} index={i}
                        onDelete={id => setReels(prev => prev.filter(r => r.id !== id))}
                        onUpdate={(id, at) => setReels(prev => prev.map(r => r.id === id ? { ...r, scheduled_at: at } : r))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}

          {/* Histórico */}
          {(doneReels.length > 0 || doneYt.length > 0) && (
            <section className="space-y-4">
              <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] px-1">Histórico</h2>
              <div className="space-y-3">
                {doneYt.map((s, i) => (
                  <YoutubeScheduleCard key={s.id} schedule={s} index={i} onDelete={id => setYtSchedules(prev => prev.filter(x => x.id !== id))} />
                ))}
                {doneReels.map((reel, i) => (
                  <ScheduleCard key={reel.id} reel={reel} index={i}
                    onDelete={id => setReels(prev => prev.filter(r => r.id !== id))}
                    onUpdate={(id, at) => setReels(prev => prev.map(r => r.id === id ? { ...r, scheduled_at: at } : r))}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function YoutubeScheduleCard({ schedule, index, onDelete }: { schedule: YouTubeSchedule; index: number; onDelete: (id: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const eta = schedule.status === 'pending' ? timeUntil(schedule.scheduled_at) : null;
  const cfg = STATUS_CONFIG[schedule.status as ScheduleStatus] ?? STATUS_CONFIG.pending;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.youtube.deleteSchedule(schedule.id);
      onDelete(schedule.id);
    } catch (err: any) { console.error(err); }
    finally { setIsDeleting(false); setConfirmDelete(false); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04 }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3"
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0">
          <Youtube className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {schedule.youtube_accounts?.channel_name ?? 'YouTube Shorts'}
          </p>
          {schedule.title && <p className="text-sm text-white font-medium truncate">{schedule.title}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(schedule.scheduled_at)}
            </span>
            {eta && <span className="text-[11px] text-purple-400 font-medium">{eta}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wide ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
          {schedule.youtube_url && (
            <a href={schedule.youtube_url} target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {schedule.status === 'pending' && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            <p className="text-xs text-gray-400">Remover do painel? <span className="text-gray-600">(o vídeo permanece no YouTube)</span></p>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleDelete} disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50">
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remover
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 text-xs font-bold transition-all">Manter</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScheduleCard({ reel, index, onDelete, onUpdate }: {
  reel: ScheduledReel; index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, scheduledAt: string) => void;
}) {
  const cfg = STATUS_CONFIG[reel.status] ?? STATUS_CONFIG.pending;
  const eta = reel.status === 'pending' ? timeUntil(reel.scheduled_at) : null;
  const isPending = reel.status === 'pending';
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(toLocalInput(reel.scheduled_at));
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.instagram.deleteSchedule(reel.id);
      onDelete(reel.id);
    } catch (err: any) { console.error(err); }
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
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04 }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3"
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/10">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Instagram Reels{reel.instagram_username ? ` · @${reel.instagram_username}` : ''}
          </p>
          {reel.caption && <p className="text-sm text-white font-medium truncate">{reel.caption}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {isEditing ? (
              <span className="text-[11px] text-purple-400">Editando horário...</span>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Calendar className="w-3 h-3" />{formatDate(reel.scheduled_at)}
                </span>
                {eta && <span className="text-[11px] text-purple-400 font-medium">{eta}</span>}
                {reel.status === 'published' && reel.published_at && (
                  <span className="text-[11px] text-gray-600">Publicado em {formatDate(reel.published_at)}</span>
                )}
              </>
            )}
          </div>
          {reel.status === 'failed' && reel.error_message && (
            <p className="text-[11px] text-red-400 mt-1">{reel.error_message}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wide ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
          {reel.instagram_url && (
            <a href={reel.instagram_url} target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {isPending && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {isPending && !confirmDelete && !isEditing && (
            <button onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 pt-2 border-t border-white/5">
            <input type="datetime-local" value={editValue} onChange={e => setEditValue(e.target.value)}
              className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
            <button onClick={handleSaveEdit} disabled={isSaving}
              className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-all disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setIsEditing(false); setEditValue(toLocalInput(reel.scheduled_at)); }}
              className="w-10 h-10 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center transition-all">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            <p className="text-xs text-gray-400">Cancelar este agendamento? <span className="text-gray-600">(o vídeo não será excluído)</span></p>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleDelete} disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50">
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Cancelar agendamento
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 text-xs font-bold transition-all">Manter</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
