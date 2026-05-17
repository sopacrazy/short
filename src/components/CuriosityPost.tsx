import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lightbulb, Sparkles, Loader2, Copy, Check, RefreshCw,
  ImageOff, Upload, X, RotateCcw, FolderPlus, Settings2,
  Trash2, Globe, ChevronDown, Search, ArrowLeft, ArrowRight,
  Instagram, ExternalLink, Send, CalendarClock, Calendar,
} from 'lucide-react';
import { api, type CuriosityFolder, type CuriositySuggestion } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type AppView    = 'selection' | 'creation';
type Stage      = 'idle' | 'generating_text' | 'generating_image' | 'done';
type ImageMode  = 'standard' | 'advanced';

interface PostResult {
  title_white: string;
  title_yellow: string;
  description: string;
  cta: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🚀', label: 'Espaço',       query: 'mistérios e curiosidades do espaço e universo' },
  { emoji: '🌊', label: 'Oceano',       query: 'curiosidades chocantes do oceano profundo' },
  { emoji: '🧬', label: 'Ciência',      query: 'descobertas científicas impressionantes e recentes' },
  { emoji: '👻', label: 'Mistérios',    query: 'mistérios inexplicáveis do mundo' },
  { emoji: '🤖', label: 'Tecnologia',   query: 'inteligência artificial e tecnologia surpreendente' },
  { emoji: '🦁', label: 'Animais',      query: 'curiosidades chocantes e bizarras sobre animais' },
  { emoji: '🏛️', label: 'História',     query: 'fatos históricos chocantes e desconhecidos' },
  { emoji: '🧠', label: 'Psicologia',   query: 'curiosidades sobre o cérebro e comportamento humano' },
  { emoji: '🌋', label: 'Natureza',     query: 'fenômenos naturais extremos e curiosos' },
  { emoji: '💀', label: 'Sombrio',      query: 'curiosidades sombrias e perturbadoras do mundo' },
];

const LANGUAGES = [
  { code: 'pt',    label: 'Português (BR)' },
  { code: 'pt-PT', label: 'Português (PT)' },
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'it',    label: 'Italiano' },
];

const EMOJIS = ['📁','🐙','🌍','🦁','🔬','🏛️','🚀','🌊','🧠','💡','⚡','🎯','🦋','🔥','🌿'];

const STAGES = [
  { key: 'idle',             label: 'Aguardando' },
  { key: 'generating_text',  label: 'Gerando conteúdo' },
  { key: 'generating_image', label: 'Gerando imagem' },
  { key: 'done',             label: 'Post pronto' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderHighlighted(text: string) {
  const parts = text.split(/\[([^\]]+)\]/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="text-[#FFB800] font-semibold">{part}</span>
      : part
  );
}

// Compõe a imagem final (fundo + gradiente + título + descrição + logo) para postar no Instagram
const FOOTER_BY_LANG: Record<string, string> = {
  'pt':    'SIGA  ·  CURTA  ·  COMPARTILHE',
  'pt-PT': 'SIGA  ·  CURTA  ·  PARTILHA',
  'en':    'FOLLOW  ·  LIKE  ·  SHARE',
  'es':    'SÍGUENOS  ·  ME GUSTA  ·  COMPARTE',
  'fr':    'SUIVEZ  ·  AIMEZ  ·  PARTAGEZ',
  'de':    'FOLGEN  ·  LIKEN  ·  TEILEN',
  'it':    'SEGUI  ·  MI PIACE  ·  CONDIVIDI',
  'ja':    'フォロー  ·  いいね  ·  シェア',
  'ko':    '팔로우  ·  좋아요  ·  공유',
  'zh':    '关注  ·  点赞  ·  分享',
};

async function composePostImage(
  rawImageUrl: string,
  titleWhite: string,
  titleYellow: string,
  description: string,
  logoUrl: string | null,
  apiBase: string,
  language = 'pt',
): Promise<string> {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const YELLOW = '#F5C400';
  const WHITE  = '#FFFFFF';
  const GRAY   = '#AAAAAA';
  const BG     = '#0A0A0A';
  const TF     = '"Bebas Neue", Impact, "Arial Black", sans-serif';

  try { await document.fonts.load('1em "Bebas Neue"'); } catch {}

  // ─── 1. Fundo preto ───────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ─── Helper: auto-fit em UMA linha ───────────────────────────────────────
  const fitSize = (text: string, max: number, pad = 80): number => {
    let s = max;
    while (s > 24) {
      ctx.font = `${s}px ${TF}`;
      if (ctx.measureText(text).width <= W - pad) break;
      s -= 2;
    }
    return s;
  };

  // ─── Pré-calcular tamanhos e posições ─────────────────────────────────────
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // Hierarquia: branco menor (setup) → amarelo maior (impacto/revelação)
  const wSize = fitSize(titleWhite,  74, 80);
  const ySize = fitSize(titleYellow, 106, 70);

  const logoH    = 120;
  const logoTopY = 24;
  const logoBottomY = logoUrl ? logoTopY + logoH + 14 : 38;

  const wBaseline  = logoBottomY + wSize + 12;
  const yBaseline  = wBaseline + 14 + ySize;
  const imgStartY  = yBaseline + 32;
  const imgEndY    = H - 295;
  const imgH       = imgEndY - imgStartY;

  // ─── 2. Imagem hero ───────────────────────────────────────────────────────
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.max(W / img.width, imgH / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, imgStartY, W, imgH); ctx.clip();
      ctx.drawImage(img, (W - sw) / 2, imgStartY + (imgH - sh) / 2, sw, sh);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `${apiBase}/api/proxy/image?url=${encodeURIComponent(rawImageUrl)}`;
  });

  // Vinheta radial
  const vig = ctx.createRadialGradient(W/2, imgStartY+imgH/2, imgH*0.15, W/2, imgStartY+imgH/2, imgH*0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.65, 'rgba(0,0,0,0.22)');
  vig.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = vig; ctx.fillRect(0, imgStartY, W, imgH);

  // Fade superior → preto
  const ft = ctx.createLinearGradient(0, imgStartY, 0, imgStartY + 90);
  ft.addColorStop(0, BG); ft.addColorStop(1, 'rgba(10,10,10,0)');
  ctx.fillStyle = ft; ctx.fillRect(0, imgStartY, W, 90);

  // Fade inferior → preto
  const fb = ctx.createLinearGradient(0, imgEndY - 110, 0, imgEndY);
  fb.addColorStop(0, 'rgba(10,10,10,0)'); fb.addColorStop(1, BG);
  ctx.fillStyle = fb; ctx.fillRect(0, imgEndY - 110, W, 110);

  // ─── 3. Logo ──────────────────────────────────────────────────────────────
  if (logoUrl) {
    await new Promise<void>((resolve) => {
      const logo = new Image();
      logo.onload = () => {
        const lw = logo.width * (logoH / logo.height);
        ctx.globalAlpha = 0.40;
        ctx.drawImage(logo, (W - lw) / 2, logoTopY, lw, logoH);
        ctx.globalAlpha = 1;
        resolve();
      };
      logo.onerror = () => resolve();
      logo.src = logoUrl;
    });
  }

  // ─── 4. Título branco — outline preto + fill branco ──────────────────────
  (ctx as any).letterSpacing = '3px';
  ctx.font = `${wSize}px ${TF}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(7, wSize * 0.09);
  ctx.strokeStyle = 'rgba(0,0,0,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 3;
  ctx.strokeText(titleWhite, W / 2, wBaseline);
  ctx.fillStyle = WHITE;
  ctx.fillText(titleWhite, W / 2, wBaseline);

  // ─── 5. Título amarelo — glow dourado ─────────────────────────────────────
  (ctx as any).letterSpacing = '2px';
  ctx.font = `${ySize}px ${TF}`;
  ctx.lineWidth = Math.max(8, ySize * 0.08);
  ctx.strokeStyle = 'rgba(0,0,0,0.88)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12;
  ctx.strokeText(titleYellow, W / 2, yBaseline);
  // Glow pass
  ctx.shadowColor = YELLOW; ctx.shadowBlur = 32; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = YELLOW;
  ctx.fillText(titleYellow, W / 2, yBaseline);
  // Clean fill (sem glow — deixa o centro nítido)
  ctx.shadowBlur = 0;
  ctx.fillText(titleYellow, W / 2, yBaseline);
  (ctx as any).letterSpacing = '0px';

  // ─── 7. Descrição — palavras-chave em amarelo ─────────────────────────────
  const dSize = 34, dLineH = dSize + 16;
  ctx.font = `${dSize}px ${TF}`;

  const cWords: { w: string; y: boolean }[] = [];
  description.split(/\[([^\]]+)\]/g).forEach((part, idx) => {
    part.split(/\s+/).filter(Boolean).forEach(word =>
      cWords.push({ w: word.toUpperCase(), y: idx % 2 === 1 })
    );
  });

  const dLines: { w: string; y: boolean }[][] = [];
  let dCur: { w: string; y: boolean }[] = [];
  for (const cw of cWords) {
    const test = [...dCur, cw].map(x => x.w).join(' ');
    if (ctx.measureText(test).width > W - 100 && dCur.length) {
      dLines.push(dCur); if (dLines.length >= 2) break; dCur = [cw];
    } else { dCur.push(cw); }
  }
  if (dCur.length && dLines.length < 2) dLines.push(dCur);

  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
  const dStartY = imgEndY + 36;
  dLines.forEach((line, li) => {
    const y = dStartY + li * dLineH;
    const totalW = ctx.measureText(line.map(x => x.w).join(' ')).width;
    let x = W / 2 - totalW / 2; ctx.textAlign = 'left';
    line.forEach((cw, wi) => {
      const str = wi < line.length - 1 ? cw.w + ' ' : cw.w;
      ctx.fillStyle = cw.y ? YELLOW : WHITE;
      ctx.fillText(str, x, y); x += ctx.measureText(str).width;
    });
    ctx.textAlign = 'center';
  });

  // ─── 8. Rodapé ────────────────────────────────────────────────────────────
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const footY = dStartY + dLines.length * dLineH + 52;
  ctx.font = `26px ${TF}`; ctx.fillStyle = GRAY;
  (ctx as any).letterSpacing = '4px';
  ctx.fillText(FOOTER_BY_LANG[language] ?? FOOTER_BY_LANG['pt'], W / 2, footY);
  (ctx as any).letterSpacing = '0px';

  return canvas.toDataURL('image/jpeg', 0.93);
}

async function fetchImageAsBase64(proxyUrl: string): Promise<string> {
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`Falha ao baixar imagem (${response.status})`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImage(file: File, maxSize = 240): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png', 0.9));
    };
    img.src = url;
  });
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

interface ScheduleModalInlineProps {
  onConfirm: (scheduledAt: string) => Promise<void>;
  onClose: () => void;
}

function ScheduleModalInline({ onConfirm, onClose }: ScheduleModalInlineProps) {
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 2);
  const minStr = minDate.toISOString().slice(0, 16);
  const [value, setValue] = useState(minStr);
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
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ai-primary" /> Agendar publicação
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-400 transition-all">
            Cancelar
          </button>
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

// ─── Folder Modal ─────────────────────────────────────────────────────────────

interface FolderModalProps {
  folder: CuriosityFolder | null;
  onSave: (f: Omit<CuriosityFolder, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function FolderModal({ folder, onSave, onDelete, onClose }: FolderModalProps) {
  const [name, setName]         = useState(folder?.name ?? '');
  const [emoji, setEmoji]       = useState(folder?.emoji ?? '📁');
  const [language, setLanguage] = useState(folder?.language ?? 'pt');
  const [logoData, setLogoData] = useState<string | null>(folder?.logo_data ?? null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoData(await resizeImage(file));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), emoji, language, logo_data: logoData }); onClose(); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm(`Excluir pasta "${name}"?`)) return;
    setDeleting(true);
    try { await onDelete(); onClose(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#111112] border border-white/10 rounded-3xl p-7 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{folder ? 'Editar Pasta' : 'Nova Pasta'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-gray-500 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${emoji === e ? 'bg-ai-primary/20 ring-2 ring-ai-primary/50' : 'bg-white/5 hover:bg-white/10'}`}>{e}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Nome da Pasta</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Animais, Ciência, Tecnologia..." autoFocus
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all" />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3 h-3" /> Idioma padrão</label>
          <div className="relative">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all appearance-none cursor-pointer">
              {LANGUAGES.map(l => <option key={l.code} value={l.code} className="bg-[#111112]">{l.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Logo do Post</label>
          <div className="flex items-center gap-3">
            {logoData ? (
              <>
                <img src={logoData} alt="logo" className="h-10 object-contain rounded-lg bg-white/5 p-1" />
                <button onClick={() => setLogoData(null)} className="text-xs text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors"><X className="w-3 h-3" /> Remover</button>
              </>
            ) : (
              <button onClick={() => logoRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-gray-400 hover:text-white transition-all">
                <Upload className="w-4 h-4" /> Fazer upload da logo
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {folder && onDelete && (
            <button onClick={handleDelete} disabled={deleting} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all disabled:opacity-40">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-gray-400 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-ai-primary to-ai-secondary text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {folder ? 'Salvar' : 'Criar Pasta'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Selection View ───────────────────────────────────────────────────────────

function SelectionView({ onSelect }: { onSelect: (curiosity: string) => void }) {
  const [search, setSearch]           = useState('');
  const [suggestions, setSuggestions] = useState<CuriositySuggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [error, setError]             = useState<string | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setCurrentQuery(query.trim());
    try {
      const result = await api.curiosityPost.suggestions(query.trim(), 5);
      setSuggestions(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar sugestões');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-ai-primary/10 border border-ai-primary/20 text-ai-primary">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Post de Curiosidades</h2>
        </div>
        <p className="text-gray-600 text-sm">Escolha uma categoria ou pesquise um tema para gerar 5 sugestões virais.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchSuggestions(search)}
          placeholder="Pesquisar tema... Ex: buracos negros, formigas, memória humana..."
          className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 pl-5 pr-36 text-base focus:border-ai-primary/50 transition-all outline-none placeholder:text-gray-700"
        />
        <button
          onClick={() => fetchSuggestions(search)}
          disabled={loading || !search.trim()}
          className="absolute right-2 top-2 bottom-2 px-5 bg-gradient-to-r from-ai-primary to-ai-secondary text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Categorias</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => { setSearch(cat.label); fetchSuggestions(cat.query); }}
              disabled={loading}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/15 transition-all group disabled:opacity-50 active:scale-95"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
              <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-12">
            <div className="w-10 h-10 rounded-full border-4 border-ai-primary/20 border-t-ai-primary animate-spin" />
            <span className="text-sm text-gray-500">Gerando sugestões virais sobre "{currentQuery}"...</span>
          </motion.div>
        )}

        {!loading && error && (
          <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3">
            {error}
          </motion.p>
        )}

        {!loading && suggestions.length > 0 && (
          <motion.div key="suggestions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                {suggestions.length} sugestões sobre "{currentQuery}"
              </span>
              <button onClick={() => fetchSuggestions(currentQuery)} disabled={loading}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-ai-primary transition-colors">
                <RefreshCw className="w-3 h-3" /> Gerar novas
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => onSelect(s.title)}
                  className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-ai-primary/30 text-left transition-all group active:scale-[0.99]"
                >
                  <span className="text-3xl shrink-0 group-hover:scale-110 transition-transform">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-ai-primary transition-colors leading-snug">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{s.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider px-2 py-1 rounded-lg bg-white/5">{s.niche}</span>
                    <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-ai-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-all ${copied ? 'text-emerald-400' : 'text-gray-600 hover:text-ai-primary'}`}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CuriosityPost() {
  const [view, setView]           = useState<AppView>('selection');
  const [curiosity, setCuriosity] = useState('');
  const [stage, setStage]         = useState<Stage>('idle');
  const [imageMode, setImageMode] = useState<ImageMode>('standard');
  const [result, setResult]       = useState<PostResult | null>(null);
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied]       = useState<string | null>(null);
  const [igStatus, setIgStatus]   = useState<'idle' | 'posting' | 'done' | 'error'>('idle');
  const [igUrl, setIgUrl]         = useState<string | null>(null);
  const [igError, setIgError]     = useState<string | null>(null);
  // Post salvo no banco (para agendamento)
  const [savedPostId, setSavedPostId]   = useState<string | null>(null);
  const [composedPath, setComposedPath] = useState<string | null>(null);
  // Modal de agendamento
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedStatus, setSchedStatus]   = useState<'idle' | 'saving' | 'done'>('idle');
  const [schedAt, setSchedAt]           = useState<string | null>(null);
  const [isComposingForSchedule, setIsComposingForSchedule] = useState(false);

  // Folder state
  const [folders, setFolders]                   = useState<CuriosityFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showModal, setShowModal]               = useState(false);
  const [editingFolder, setEditingFolder]       = useState<CuriosityFolder | null>(null);

  // Active settings
  const [language, setLanguage] = useState('pt');
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const activeFolder    = folders.find(f => f.id === selectedFolderId) ?? null;
  const currentStageIdx = STAGES.findIndex(s => s.key === stage);
  const isLoading       = stage === 'generating_text' || stage === 'generating_image';

  // Ref sempre sincronizado com o idioma efetivo — nunca fica stale em closures
  const effectiveLangRef = useRef<string>('pt');
  effectiveLangRef.current = activeFolder?.language ?? language;

  useEffect(() => {
    api.curiosityFolders.list().then(setFolders).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeFolder) {
      setLanguage(activeFolder.language);
      setLogoUrl(activeFolder.logo_data ?? null);
    } else if (!selectedFolderId) {
      setLanguage('pt');
      setLogoUrl(null);
    }
  }, [selectedFolderId, folders]);

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSelectCuriosity = (title: string) => {
    const lang = effectiveLangRef.current; // captura antes de qualquer setState
    setCuriosity(title);
    setResult(null);
    setImageUrl(null);
    setImageError(false);
    setTextError(null);
    setStage('idle');
    setView('creation');
    handleGenerate(title, lang);
  };

  const handleBack = () => {
    setView('selection');
    setResult(null);
    setImageUrl(null);
    setStage('idle');
  };

  const handleGenerate = async (forcedText?: string, forcedLanguage?: string) => {
    const text = (forcedText ?? curiosity).trim();
    const lang = forcedLanguage ?? activeFolder?.language ?? language;
    if (!text || isLoading) return;
    setResult(null);
    setImageUrl(null);
    setImageError(false);
    setTextError(null);
    setIgStatus('idle');
    setIgUrl(null);
    setIgError(null);
    setSavedPostId(null);
    setComposedPath(null);
    setSchedStatus('idle');
    setSchedAt(null);
    setStage('generating_text');

    let post: PostResult;
    try {
      post = await api.curiosityPost.generate(text, lang);
      setResult(post);
    } catch (err: any) {
      setTextError(err.message || 'Erro ao gerar conteúdo');
      setStage('idle');
      return;
    }

    setStage('generating_image');
    let finalImageUrl: string | null = null;
    try {
      const { url } = imageMode === 'advanced'
        ? await api.curiosityPost.generateAdvancedImage({
            title_white: post.title_white,
            title_yellow: post.title_yellow,
            description: post.description,
            image_prompt: post.image_prompt,
          })
        : await api.curiosityPost.generateImage(post.image_prompt);
      setImageUrl(url);
      finalImageUrl = url;
    } catch { setImageError(true); }
    setStage('done');

    // Auto-salvar como rascunho — faz upload da imagem para o Supabase (URL permanente)
    try {
      let persistedImageUrl: string | null = finalImageUrl;
      if (finalImageUrl && imageMode === 'standard') {
        try {
          const base64 = await fetchImageAsBase64(
            `${api.getBaseUrl()}/api/proxy/image?url=${encodeURIComponent(finalImageUrl)}`
          );
          const { url } = await api.curiosityPost.uploadComposed(base64);
          persistedImageUrl = url;
        } catch { /* mantém URL original como fallback */ }
      }

      const saved = await api.curiosityPosts.create({
        folder_id: selectedFolderId ?? undefined,
        title_white: post.title_white,
        title_yellow: post.title_yellow,
        description: post.description,
        cta: post.cta,
        caption: post.caption,
        hashtags: post.hashtags,
        image_prompt: post.image_prompt,
        image_url: persistedImageUrl ?? undefined,
        status: 'draft',
      });
      setSavedPostId(saved.id);
    } catch { /* salvar silenciosamente */ }
  };

  const handleRegenerateImage = async (mode?: ImageMode) => {
    if (!result || isLoading) return;
    const activeMode = mode ?? imageMode;
    setImageUrl(null);
    setImageError(false);
    setComposedPath(null);
    setStage('generating_image');
    try {
      const { url } = activeMode === 'advanced'
        ? await api.curiosityPost.generateAdvancedImage({
            title_white: result.title_white,
            title_yellow: result.title_yellow,
            description: result.description,
            image_prompt: result.image_prompt,
          })
        : await api.curiosityPost.generateImage(result.image_prompt);
      setImageUrl(url);
    } catch { setImageError(true); }
    setStage('done');
  };

  const handlePostInstagram = async () => {
    if (!result || !imageUrl || igStatus === 'posting') return;
    setIgStatus('posting');
    setIgError(null);
    try {
      let composedUrl: string;
      let path: string;
      if (imageMode === 'advanced') {
        const base64 = await fetchImageAsBase64(
          `${api.getBaseUrl()}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`,
        );
        ({ url: composedUrl, path } = await api.curiosityPost.uploadComposed(base64));
      } else {
        const composed = await composePostImage(
          imageUrl, result.title_white, result.title_yellow,
          result.description, logoUrl, api.getBaseUrl(), language,
        );
        ({ url: composedUrl, path } = await api.curiosityPost.uploadComposed(composed));
      }

      setComposedPath(path);
      if (savedPostId) api.curiosityPosts.update(savedPostId, { composed_image_path: path }).catch(() => {});

      const caption = `${result.caption}\n\n${result.cta}\n\n${result.hashtags.map(h => `#${h}`).join(' ')}`;
      const { instagram_url } = await api.instagram.uploadPhoto(composedUrl, caption);
      setIgUrl(instagram_url);
      setIgStatus('done');

      if (savedPostId) api.curiosityPosts.update(savedPostId, {
        status: 'published',
        published_at: new Date().toISOString(),
        instagram_post_url: instagram_url,
      }).catch(() => {});
    } catch (err: any) {
      setIgError(err.message || 'Erro ao postar no Instagram');
      setIgStatus('error');
    }
  };

  const handleScheduleClick = async () => {
    if (!result || !imageUrl || isComposingForSchedule) return;
    if (composedPath) { setShowSchedule(true); return; }
    setIsComposingForSchedule(true);
    try {
      let path: string;
      if (imageMode === 'advanced') {
        const base64 = await fetchImageAsBase64(
          `${api.getBaseUrl()}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`,
        );
        ({ path } = await api.curiosityPost.uploadComposed(base64));
      } else {
        const composed = await composePostImage(
          imageUrl, result.title_white, result.title_yellow,
          result.description, logoUrl, api.getBaseUrl(), language,
        );
        ({ path } = await api.curiosityPost.uploadComposed(composed));
      }
      setComposedPath(path);
      if (savedPostId) await api.curiosityPosts.update(savedPostId, { composed_image_path: path }).catch(() => {});
      setShowSchedule(true);
    } catch { /* silently fail — user can retry */ }
    finally { setIsComposingForSchedule(false); }
  };

  const handleScheduleConfirm = async (scheduledAt: string) => {
    if (!savedPostId) return;
    setSchedStatus('saving');
    try {
      await api.curiosityPosts.update(savedPostId, {
        status: 'scheduled',
        scheduled_at: scheduledAt,
        composed_image_path: composedPath ?? undefined,
      });
      setSchedAt(scheduledAt);
      setSchedStatus('done');
    } catch (err: any) {
      setSchedStatus('idle');
      throw err;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUrl(await resizeImage(file));
  };

  const handleSaveFolder = async (data: Omit<CuriosityFolder, 'id' | 'user_id' | 'created_at'>) => {
    if (editingFolder) {
      const updated = await api.curiosityFolders.update(editingFolder.id, data);
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      if (selectedFolderId === updated.id) { setLanguage(updated.language); setLogoUrl(updated.logo_data ?? null); }
    } else {
      const created = await api.curiosityFolders.create(data.name, data.emoji, data.language, data.logo_data);
      setFolders(prev => [...prev, created]);
      setSelectedFolderId(created.id);
    }
    setEditingFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!editingFolder) return;
    await api.curiosityFolders.delete(editingFolder.id);
    setFolders(prev => prev.filter(f => f.id !== editingFolder.id));
    if (selectedFolderId === editingFolder.id) { setSelectedFolderId(null); setLogoUrl(null); setLanguage('pt'); }
    setEditingFolder(null);
  };

  const activeLangLabel = LANGUAGES.find(l => l.code === language)?.label ?? language;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-7">

      {/* ── Folder Bar ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setSelectedFolderId(null); setLanguage('pt'); setLogoUrl(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!selectedFolderId ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'}`}
          >
            Todas
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="flex items-center gap-0.5">
              <button
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-l-xl text-xs font-bold transition-all ${
                  selectedFolderId === folder.id
                    ? 'bg-ai-primary/15 text-ai-primary border border-ai-primary/30'
                    : 'bg-white/[0.03] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <span>{folder.emoji}</span>
                <span>{folder.name}</span>
                {folder.logo_data && <span className="text-[9px] opacity-50">• logo</span>}
                <span className={`text-[9px] opacity-60 ${selectedFolderId === folder.id ? 'text-ai-primary' : ''}`}>
                  {LANGUAGES.find(l => l.code === folder.language)?.label.split(' ')[0] ?? folder.language}
                </span>
              </button>
              <button
                onClick={() => { setEditingFolder(folder); setShowModal(true); }}
                className={`px-2 py-2 rounded-r-xl text-xs transition-all border-l border-white/5 ${
                  selectedFolderId === folder.id
                    ? 'bg-ai-primary/10 text-ai-primary/60 hover:text-ai-primary border border-ai-primary/30 border-l-white/10'
                    : 'bg-white/[0.03] text-gray-700 hover:text-gray-300 hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={() => { setEditingFolder(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/10 text-xs text-gray-600 hover:text-gray-300 hover:border-white/20 transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Nova Pasta
          </button>
        </div>

        {activeFolder && (
          <motion.div key={activeFolder.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-ai-primary/5 border border-ai-primary/15 w-fit">
            <span className="text-[11px] text-ai-primary font-semibold">{activeFolder.emoji} {activeFolder.name}</span>
            <span className="w-px h-3 bg-ai-primary/20" />
            <span className="text-[11px] text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {activeLangLabel}</span>
            {activeFolder.logo_data && (
              <><span className="w-px h-3 bg-ai-primary/20" /><img src={activeFolder.logo_data} alt="logo" className="h-4 object-contain opacity-70" /></>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Views ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* SELECTION */}
        {view === 'selection' && (
          <motion.div key="selection" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <SelectionView onSelect={handleSelectCuriosity} />
          </motion.div>
        )}

        {/* CREATION */}
        {view === 'creation' && (
          <motion.div key="creation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
            className="space-y-7">

            {/* Back + Language */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button onClick={handleBack} disabled={isLoading} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Escolher outro tema
              </button>

              {!activeFolder && stage === 'idle' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Idioma:
                  </span>
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLanguage(l.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${language === l.code ? 'bg-ai-primary/15 text-ai-primary border border-ai-primary/30' : 'bg-white/[0.03] text-gray-600 hover:text-gray-300 border border-transparent'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tema selecionado + input para editar */}
            <div className="max-w-3xl space-y-3">
              <div className="flex items-start gap-3 p-5 rounded-3xl bg-ai-primary/5 border border-ai-primary/20">
                <Lightbulb className="w-4 h-4 text-ai-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-ai-primary/60 uppercase tracking-widest">Tema selecionado</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-ai-primary/10 text-ai-primary border border-ai-primary/20 uppercase tracking-wide flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      {LANGUAGES.find(l => l.code === effectiveLangRef.current)?.label ?? effectiveLangRef.current}
                    </span>
                  </div>
                  <textarea
                    value={curiosity}
                    onChange={e => setCuriosity(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    rows={2}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white text-sm font-medium leading-relaxed outline-none resize-none placeholder:text-gray-700 disabled:opacity-70"
                  />
                </div>
                {stage === 'idle' && (
                  <button
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !curiosity.trim()}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-ai-primary to-ai-secondary text-white rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:grayscale disabled:hover:scale-100 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Gerar
                  </button>
                )}
              </div>
            </div>

            {/* Progress Steps */}
            <div className="max-w-3xl">
              <div className="flex items-center">
                {STAGES.filter(s => s.key !== 'idle').map((s, i) => {
                  const stageOrder = ['generating_text', 'generating_image', 'done'] as const;
                  const currentIdx = stageOrder.indexOf(stage as any);
                  const isActive   = stage === s.key;
                  const isDone     = currentIdx > i || stage === 'done';
                  return (
                    <div key={s.key} className="flex items-center flex-1 min-w-0">
                      <div className={`flex items-center gap-2.5 shrink-0 transition-all duration-500 ${isDone ? 'text-emerald-400' : isActive ? 'text-ai-primary' : 'text-gray-700'}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold transition-all duration-500 ${
                          isDone   ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' :
                          isActive ? 'border-ai-primary bg-ai-primary/10 text-ai-primary' :
                                     'border-gray-800 text-gray-700'
                        }`}>
                          {isDone
                            ? <Check className="w-3.5 h-3.5" />
                            : isActive
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <span className="text-xs">{i + 1}</span>
                          }
                        </div>
                        <span className={`text-xs font-semibold hidden sm:block whitespace-nowrap transition-all duration-300 ${isDone ? 'text-emerald-400' : isActive ? 'text-ai-primary' : 'text-gray-700'}`}>
                          {s.label}
                        </span>
                      </div>
                      {i < 2 && <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-700 ${isDone ? 'bg-emerald-400/40' : isActive ? 'bg-ai-primary/20' : 'bg-white/5'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Loading message */}
              <AnimatePresence>
                {isLoading && (
                  <motion.p key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-ai-primary shrink-0" />
                    {stage === 'generating_text' ? 'Criando conteúdo viral com IA...' : 'Gerando imagem cinematográfica...'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {textError && <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3 max-w-3xl">{textError}</p>}

            {/* Results */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

                  {/* Left */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Editar Conteúdo</span>
                      <button onClick={() => handleGenerate()} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-white transition-all disabled:opacity-40">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Regenerar Tudo
                      </button>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">Título do Post</span>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-gray-600 px-1">Linha 1 — Branco</label>
                          <input value={result.title_white} onChange={e => setResult(r => r ? { ...r, title_white: e.target.value } : r)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-black uppercase text-white focus:border-ai-primary/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-[#FFB800]/70 px-1">Linha 2 — Amarelo</label>
                          <input value={result.title_yellow} onChange={e => setResult(r => r ? { ...r, title_yellow: e.target.value } : r)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-black uppercase text-[#FFB800] focus:border-[#FFB800]/40 outline-none transition-all" />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">Descrição <span className="normal-case font-normal text-gray-700">(use [colchetes] para amarelo)</span></span>
                      <textarea value={result.description} onChange={e => setResult(r => r ? { ...r, description: e.target.value } : r)}
                        rows={3} className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-300 leading-relaxed focus:border-ai-primary/50 outline-none transition-all resize-none" />
                    </div>

                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">CTA <span className="normal-case font-normal text-gray-700">— pergunta para comentários</span></span>
                        <CopyButton copied={copied === 'cta'} onClick={() => copyText(result.cta, 'cta')} />
                      </div>
                      <input value={result.cta} onChange={e => setResult(r => r ? { ...r, cta: e.target.value } : r)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:border-ai-primary/50 outline-none transition-all" />
                    </div>

                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Legenda Instagram</span>
                        <CopyButton copied={copied === 'caption'} onClick={() => copyText(result.caption, 'caption')} />
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{result.caption}</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Hashtags</span>
                        <CopyButton copied={copied === 'hashtags'} onClick={() => copyText(result.hashtags.map(h => `#${h}`).join(' '), 'hashtags')} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.hashtags.map((tag, i) => (
                          <span key={i} className="text-[11px] bg-ai-primary/10 text-ai-primary border border-ai-primary/20 rounded-full px-2.5 py-1">#{tag}</span>
                        ))}
                      </div>
                    </div>

                    {!activeFolder?.logo_data && (
                      <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">Logo do Post</span>
                        <div className="flex items-center gap-3">
                          {logoUrl ? (
                            <><img src={logoUrl} alt="logo" className="h-10 object-contain rounded-lg bg-white/5 p-1" />
                              <button onClick={() => setLogoUrl(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /> Remover</button></>
                          ) : (
                            <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-gray-400 hover:text-white transition-all">
                              <Upload className="w-4 h-4" /> Fazer upload da logo
                            </button>
                          )}
                          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </div>
                      </div>
                    )}

                    <button onClick={() => copyText(`${result.caption}\n\n${result.cta}\n\n${result.hashtags.map(h => `#${h}`).join(' ')}`, 'all')}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-ai-primary/10 to-ai-secondary/10 border border-ai-primary/20 hover:border-ai-primary/40 text-sm font-bold text-ai-primary transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
                      {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied === 'all' ? 'Copiado!' : 'Copiar Legenda + CTA + Hashtags'}
                    </button>

                    {/* Instagram Post + Agendamento */}
                    <div className="pt-1 space-y-2">
                      <button
                        onClick={handlePostInstagram}
                        disabled={!imageUrl || igStatus === 'posting' || igStatus === 'done' || schedStatus === 'done'}
                        className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          igStatus === 'done'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                            : igStatus === 'error'
                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/15'
                            : 'bg-gradient-to-r from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 border border-[#833AB4]/30 hover:border-[#833AB4]/50 text-white hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'
                        }`}
                      >
                        {igStatus === 'posting' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {igStatus === 'done'    && <Check className="w-4 h-4" />}
                        {igStatus === 'error'   && <X className="w-4 h-4" />}
                        {igStatus === 'idle'    && <Instagram className="w-4 h-4" />}
                        {igStatus === 'posting' ? 'Postando no Instagram...' :
                         igStatus === 'done'    ? 'Publicado no Instagram!' :
                         igStatus === 'error'   ? 'Tentar novamente' :
                         !imageUrl              ? 'Aguardando imagem...' :
                                                  'Postar no Instagram'}
                      </button>

                      {igStatus === 'done' && igUrl && (
                        <a href={igUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Ver publicação
                        </a>
                      )}

                      {igStatus === 'error' && igError && (
                        <p className="text-xs text-rose-400/70 text-center">{igError}</p>
                      )}

                      {/* Agendar */}
                      {schedStatus === 'done' && schedAt ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                          <CalendarClock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-xs font-bold text-blue-300">
                            Agendado para {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(schedAt))}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleScheduleClick}
                          disabled={!imageUrl || !savedPostId || isComposingForSchedule || igStatus === 'done'}
                          className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/15 hover:border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isComposingForSchedule
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando imagem...</>
                            : <><CalendarClock className="w-4 h-4" /> Agendar para o Instagram</>
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right — Preview */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Preview Instagram</span>
                      {imageMode === 'advanced' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-ai-primary/10 text-ai-primary border border-ai-primary/20">
                          🎬 Avançado
                        </span>
                      )}
                    </div>

                    <div className="w-full max-w-[380px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                      <div className="flex items-center justify-between px-3 py-2.5 bg-black">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ai-primary to-ai-secondary flex items-center justify-center text-[9px] font-bold text-white">C</div>
                          <span className="text-xs font-semibold text-white">clipaai</span>
                        </div>
                        <span className="text-gray-600 text-xl leading-none">···</span>
                      </div>

                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0A0A0B]">
                        {stage === 'generating_image' && !imageUrl ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full border-4 border-ai-primary/20 border-t-ai-primary animate-spin" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse">Gerando imagem...</span>
                          </div>
                        ) : imageError ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-700">
                            <ImageOff className="w-10 h-10 opacity-20" />
                            <span className="text-[10px] text-center font-bold uppercase tracking-widest opacity-40">Imagem indisponível</span>
                          </div>
                        ) : imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Post"
                            className={`absolute inset-0 w-full h-full ${imageMode === 'advanced' ? 'object-contain' : 'object-cover'}`}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
                        )}
                        {imageMode === 'standard' && <>
                          {/* Vinheta sobre a imagem */}
                          <div className="absolute inset-0 pointer-events-none" style={{
                            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.82) 100%)',
                          }} />
                          {/* Fundo preto no topo (área de título) */}
                          <div className="absolute top-0 left-0 right-0" style={{
                            height: '46%',
                            background: 'linear-gradient(to bottom, #0A0A0A 55%, rgba(10,10,10,0))',
                          }} />
                          {/* Fundo preto na base (área de descrição) */}
                          <div className="absolute bottom-0 left-0 right-0" style={{
                            height: '26%',
                            background: 'linear-gradient(to top, #0A0A0A 65%, rgba(10,10,10,0))',
                          }} />

                          {/* Logo + títulos no topo */}
                          <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-2.5 px-3 gap-0" style={{ containerType: 'inline-size' }}>
                            {logoUrl ? (
                              <img src={logoUrl} alt="logo" className="h-14 object-contain mb-1" style={{ opacity: 0.40 }} />
                            ) : (
                              <button onClick={() => logoInputRef.current?.click()} className="mb-1 px-2 py-0.5 rounded border border-white/20 text-[7px] text-white/40 hover:text-white/60 transition-all flex items-center gap-1">
                                <Upload className="w-2 h-2" /> logo
                              </button>
                            )}
                            {/* Título branco — menor, outline preto */}
                            <h3 className="text-white uppercase leading-[1.05] text-center w-full" style={{
                              fontFamily: '"Bebas Neue", Impact, "Arial Black", sans-serif',
                              fontSize: 'clamp(12px, 5cqw, 22px)',
                              WebkitTextStroke: '0.6px rgba(0,0,0,0.7)',
                              textShadow: '0 2px 6px rgba(0,0,0,0.95)',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              letterSpacing: '0.04em',
                            }}>{result.title_white}</h3>
                            {/* Título amarelo — maior, glow dourado */}
                            <h3 className="uppercase leading-[1.0] text-center w-full" style={{
                              fontFamily: '"Bebas Neue", Impact, "Arial Black", sans-serif',
                              fontSize: 'clamp(18px, 7.5cqw, 34px)',
                              color: '#F5C400',
                              WebkitTextStroke: '0.5px rgba(0,0,0,0.6)',
                              textShadow: '0 0 18px rgba(245,196,0,0.55), 0 2px 8px rgba(0,0,0,0.9)',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              letterSpacing: '0.03em',
                            }}>{result.title_yellow}</h3>
                          </div>

                          {/* Descrição + rodapé na base */}
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex flex-col items-center text-center gap-0.5">
                            <p className="leading-tight" style={{
                              fontSize: 'clamp(8px, 2.8vw, 12px)',
                              fontFamily: '"Bebas Neue", Impact, sans-serif',
                              color: 'rgba(255,255,255,0.9)',
                              letterSpacing: '0.03em',
                            }}>
                              {renderHighlighted(result.description)}
                            </p>
                            <p className="uppercase tracking-widest" style={{
                              fontSize: '7px',
                              fontFamily: '"Bebas Neue", Impact, sans-serif',
                              color: '#888',
                              letterSpacing: '3px',
                            }}>{FOOTER_BY_LANG[language] ?? FOOTER_BY_LANG['pt']}</p>
                          </div>
                        </>}
                      </div>

                      <div className="bg-black px-3 py-2.5 space-y-2">
                        <div className="flex items-center justify-between text-gray-500">
                          <div className="flex items-center gap-3 text-[20px]"><span>🤍</span><span>💬</span><span>↗️</span></div>
                          <span className="text-[20px]">🔖</span>
                        </div>
                        <div className="space-y-1.5">
                          {result.caption.split('\n').filter(p => p.trim()).map((para, i) => (
                            <p key={i} className="text-[10px] text-gray-400 leading-relaxed">
                              {i === 0 && <span className="font-semibold text-white">clipaai </span>}
                              {renderHighlighted(para)}
                            </p>
                          ))}
                          {result.hashtags?.length > 0 && (
                            <p className="text-[10px] text-blue-400/70 leading-relaxed">
                              {result.hashtags.map(h => `#${h}`).join(' ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Modo de imagem */}
                    <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit mx-auto">
                      <button
                        onClick={() => {
                          if (imageMode !== 'standard') { setImageMode('standard'); if (result) handleRegenerateImage('standard'); }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          imageMode === 'standard'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        ⚡ Padrão
                      </button>
                      <button
                        onClick={() => {
                          if (imageMode !== 'advanced') { setImageMode('advanced'); if (result) handleRegenerateImage('advanced'); }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          imageMode === 'advanced'
                            ? 'bg-gradient-to-r from-ai-primary/20 to-ai-secondary/20 text-white border border-ai-primary/30 shadow-sm'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        🎬 Avançado
                      </button>
                    </div>

                    <button onClick={() => handleRegenerateImage()} disabled={isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                      <RotateCcw className={`w-3.5 h-3.5 ${stage === 'generating_image' ? 'animate-spin' : ''}`} />
                      Regenerar Imagem
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Folder Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <FolderModal
            folder={editingFolder}
            onSave={handleSaveFolder}
            onDelete={editingFolder ? handleDeleteFolder : undefined}
            onClose={() => { setShowModal(false); setEditingFolder(null); }}
          />
        )}
        {showSchedule && (
          <ScheduleModalInline
            onConfirm={handleScheduleConfirm}
            onClose={() => setShowSchedule(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
