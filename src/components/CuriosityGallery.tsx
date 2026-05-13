import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Images, Calendar, CheckCircle2, XCircle, Clock, Trash2,
  ExternalLink, RefreshCw, Filter, X, CalendarClock, AlertCircle,
  Instagram,
} from 'lucide-react';
import { api, type CuriosityPostRecord, type PostStatus } from '../lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:     { label: 'Rascunho',  color: 'text-gray-400',    bg: 'bg-gray-500/15',   icon: <Clock className="w-3 h-3" /> },
  scheduled: { label: 'Agendado', color: 'text-blue-400',    bg: 'bg-blue-500/15',   icon: <CalendarClock className="w-3 h-3" /> },
  published: { label: 'Publicado', color: 'text-emerald-400', bg: 'bg-emerald-500/15',icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:    { label: 'Falhou',    color: 'text-rose-400',    bg: 'bg-rose-500/15',   icon: <XCircle className="w-3 h-3" /> },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

// ─── Schedule Modal ──────────────────────────────────────────────────────────

interface ScheduleModalProps {
  post: CuriosityPostRecord;
  onConfirm: (scheduledAt: string) => Promise<void>;
  onClose: () => void;
}

function ScheduleModal({ post, onConfirm, onClose }: ScheduleModalProps) {
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 2);
  const minStr = minDate.toISOString().slice(0, 16);

  const [value, setValue] = useState(
    post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : minStr
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!value) return;
    if (new Date(value) <= new Date()) { setError('Escolha uma data futura.'); return; }
    setSaving(true);
    try { await onConfirm(new Date(value).toISOString()); onClose(); }
    catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-[#111112] border border-white/10 rounded-3xl p-7 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-ai-primary" /> Agendar publicação</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Data e horário</label>
          <input
            type="datetime-local"
            value={value}
            min={minStr}
            onChange={e => { setValue(e.target.value); setError(''); }}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-400 transition-all">Cancelar</button>
          <button onClick={handleConfirm} disabled={saving || !value}
            className="flex-1 py-2.5 rounded-xl bg-ai-primary hover:bg-ai-primary/90 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

interface DetailModalProps {
  post: CuriosityPostRecord;
  onSchedule: () => void;
  onCancelSchedule: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

function DetailModal({ post, onSchedule, onCancelSchedule, onDelete, onClose }: DetailModalProps) {
  const s = STATUS_CONFIG[post.status];
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#111112] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagem */}
        <div className="relative aspect-square w-full max-h-64 bg-black overflow-hidden">
          {post.image_url ? (
            <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Images className="w-12 h-12 text-gray-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black uppercase text-xl leading-tight drop-shadow">{post.title_white}</p>
            <p className="text-[#FFB800] font-black uppercase text-xl leading-tight drop-shadow">{post.title_yellow}</p>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${s.bg} ${s.color}`}>
            {s.icon} {s.label}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Descrição */}
          <p className="text-sm text-gray-300 leading-relaxed">{post.description}</p>

          {/* Info de agendamento */}
          {post.status === 'scheduled' && post.scheduled_at && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <CalendarClock className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-300">Agendado para {formatDate(post.scheduled_at)}</span>
            </div>
          )}
          {post.status === 'published' && post.instagram_post_url && (
            <a href={post.instagram_post_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all">
              <ExternalLink className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-emerald-300">Ver publicação no Instagram</span>
            </a>
          )}
          {post.status === 'failed' && post.error_message && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-rose-300">{post.error_message}</span>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Legenda</p>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">{post.caption}</p>
          </div>

          {/* Hashtags */}
          {post.hashtags?.length > 0 && (
            <p className="text-[10px] text-blue-400/70">{post.hashtags.map(h => `#${h}`).join(' ')}</p>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            {(post.status === 'draft' || post.status === 'failed') && (
              <button onClick={onSchedule}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-ai-primary hover:bg-ai-primary/90 text-xs font-bold text-white transition-all">
                <CalendarClock className="w-3.5 h-3.5" /> Agendar
              </button>
            )}
            {post.status === 'scheduled' && (
              <button onClick={async () => { setCancelling(true); await onCancelSchedule(); setCancelling(false); }} disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all disabled:opacity-50">
                {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Cancelar agendamento
              </button>
            )}
            <button onClick={async () => { setDeleting(true); await onDelete(); setDeleting(false); }} disabled={deleting}
              className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Apagar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({ post, onClick }: { post: CuriosityPostRecord; onClick: () => void }) {
  const s = STATUS_CONFIG[post.status];
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className="relative aspect-square rounded-2xl overflow-hidden bg-[#0A0A0B] border border-white/5 hover:border-ai-primary/30 transition-all group cursor-pointer text-left"
    >
      {post.image_url ? (
        <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Images className="w-10 h-10 text-gray-700" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Status badge */}
      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${s.bg} ${s.color} backdrop-blur-sm`}>
        {s.icon} {s.label}
      </div>

      {/* Títulos */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-black uppercase text-[11px] leading-tight line-clamp-1">{post.title_white}</p>
        <p className="text-[#FFB800] font-black uppercase text-[11px] leading-tight line-clamp-1">{post.title_yellow}</p>
        <p className="text-gray-500 text-[9px] mt-1">{formatDate(post.created_at)}</p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-ai-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FILTERS: { label: string; value: string }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Agendados', value: 'scheduled' },
  { label: 'Publicados', value: 'published' },
  { label: 'Rascunhos', value: 'draft' },
  { label: 'Falhou', value: 'failed' },
];

export default function CuriosityGallery() {
  const [posts, setPosts]           = useState<CuriosityPostRecord[]>([]);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<CuriosityPostRecord | null>(null);
  const [scheduling, setScheduling] = useState<CuriosityPostRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.curiosityPosts.list(filter === 'all' ? undefined : filter);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleSchedule = async (post: CuriosityPostRecord, scheduledAt: string) => {
    const updated = await api.curiosityPosts.update(post.id, { status: 'scheduled', scheduled_at: scheduledAt });
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const handleCancelSchedule = async (post: CuriosityPostRecord) => {
    const updated = await api.curiosityPosts.update(post.id, { status: 'draft', scheduled_at: null });
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const handleDelete = async (post: CuriosityPostRecord) => {
    await api.curiosityPosts.delete(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
    setSelected(null);
  };

  const filtered = posts; // already filtered via API

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Images className="w-6 h-6 text-ai-primary" /> Galeria de Posts
            </h1>
            <p className="text-sm text-gray-500 mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''} criado{posts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-400 hover:text-white transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-600" />
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f.value
                  ? 'bg-ai-primary text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
              <Instagram className="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-400">Nenhum post encontrado</p>
              <p className="text-sm text-gray-600 mt-1">
                {filter === 'all' ? 'Gere seu primeiro post de curiosidade!' : `Nenhum post com status "${FILTERS.find(f => f.value === filter)?.label}"`}
              </p>
            </div>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map(post => (
                <PostCard key={post.id} post={post} onClick={() => setSelected(post)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modais */}
      <AnimatePresence>
        {selected && !scheduling && (
          <DetailModal
            key="detail"
            post={selected}
            onSchedule={() => { setScheduling(selected); }}
            onCancelSchedule={() => handleCancelSchedule(selected)}
            onDelete={() => handleDelete(selected)}
            onClose={() => setSelected(null)}
          />
        )}
        {scheduling && (
          <ScheduleModal
            key="schedule"
            post={scheduling}
            onConfirm={(at) => handleSchedule(scheduling, at)}
            onClose={() => setScheduling(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
