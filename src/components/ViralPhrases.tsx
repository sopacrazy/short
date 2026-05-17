import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, Loader2, RefreshCw, Type, Camera, Zap, Instagram, Send, CheckCircle2, Copy, CalendarClock, Trash2, Clock, CheckCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api';

interface Category {
  id: string;
  label: string;
  placeholder: string;
  gradient: string;
  glow: string;
  taescrito?: boolean;
}

const CATEGORIES: Category[] = [
  { id: 'motivacao',        label: 'Motivação',        placeholder: 'Ex: segunda-feira difícil, foco nos objetivos...', gradient: 'from-amber-500 to-orange-500',  glow: 'shadow-amber-500/30' },
  { id: 'amor',             label: 'Amor',             placeholder: 'Ex: saudade, reencontro, primeiro amor...',        gradient: 'from-rose-500 to-pink-500',     glow: 'shadow-rose-500/30' },
  { id: 'solidao',          label: 'Solidão',          placeholder: 'Ex: noite na cidade, silêncio, distância...',      gradient: 'from-blue-500 to-indigo-500',   glow: 'shadow-blue-500/30' },
  { id: 'autoconhecimento', label: 'Autoconhecimento', placeholder: 'Ex: limites, crescimento, aceitar-se...',          gradient: 'from-violet-500 to-purple-500', glow: 'shadow-violet-500/30' },
  { id: 'superacao',        label: 'Superação',        placeholder: 'Ex: recomeço, força, virada de chave...',          gradient: 'from-emerald-500 to-teal-500',  glow: 'shadow-emerald-500/30' },
  { id: 'taescrito',        label: 'taescrito.ai',     placeholder: 'Ex: relacionamento, ex, boleto...',                gradient: 'from-white to-gray-200',        glow: 'shadow-white/20', taescrito: true },
];

const TAESCRITO_TOPICS = [
  'ex que voltou', 'boleto', 'churrasco', 'nordeste', 'CLT',
  'WhatsApp do chefe', 'Nubank', 'fila do INSS', 'BBB',
  'domingo em família', 'deixou no visto', 'Tinder',
  'iFood', 'sertanejo', 'grupão do zap', 'fé e conta no vermelho',
  'carnaval', 'reunião que era e-mail',
];

// Tópicos globais aleatórios — situações cotidianas brasileiras fora de qualquer categoria
const SURPRISE_TOPICS = [
  'bateria de celular no vermelho', 'garçom que some depois de anotar o pedido',
  'wi-fi da sogra que não compartilha a senha', 'semáforo que dura uma eternidade',
  'colega que marca reunião às 17h55', 'promoção relâmpago que sempre esgota',
  'amigo que chega 1h atrasado e fala oi normal', 'vizinho que liga o som domingo de manhã',
  'entregador que marca como entregue sem entregar', 'táxi que cobra três preços na chuva',
  'aquele parente que pergunta sobre casamento no almoço', 'plano de saúde que nega tudo',
  'fila do cartório que não anda', 'sinal de internet que cai na hora da videochamada',
  'light que corta na sexta à noite', 'previsão do tempo sempre errada no brasil',
  'banco que fecha às 16h', 'obra na rua que nunca termina',
  'médico que atende 1h atrasado e ainda reclama do tempo', 'desconto de segunda via de boleto',
];

const TEMPLATES = ['classic', 'minimal', 'bold', 'elegant', 'handwritten', 'magazine'];

type Format = '1:1' | '4:5' | '9:16';
const FORMATS: { id: Format; label: string; w: number; h: number; aspect: string }[] = [
  { id: '1:1', label: 'Feed Quadrado', w: 1080, h: 1080, aspect: 'aspect-square' },
  { id: '4:5', label: 'Feed Retrato',  w: 1080, h: 1350, aspect: 'aspect-[4/5]' },
  { id: '9:16', label: 'Stories',      w: 1080, h: 1920, aspect: 'aspect-[9/16]' },
];

export default function ViralPhrases() {
  const [activeTab, setActiveTab] = useState<'criar' | 'agendados'>('criar');
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [format, setFormat] = useState<Format>('4:5');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [template, setTemplate] = useState('classic');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [paperStyle, setPaperStyle] = useState(true); // true = fundo papel, false = fundo escuro
  const previewRef = useRef<HTMLDivElement>(null);

  const isTaescrito = selectedCategory.taescrito;
  const currentFormat = FORMATS.find(f => f.id === format)!;

  const loadScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const data = await api.viralPhrases.getScheduled();
      setScheduledPosts(data);
    } catch { /* silencioso */ } finally {
      setLoadingScheduled(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'agendados') loadScheduled();
  }, [activeTab, loadScheduled]);

  const handleCancelScheduled = async (id: string) => {
    try {
      await api.viralPhrases.cancelScheduled(id);
      setScheduledPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message ?? 'Erro ao cancelar');
    }
  };

  const handleCategoryChange = (cat: Category) => {
    setSelectedCategory(cat);
    setQuery('');
    setResult(null);
    setImageUrl(null);
    setCaption('');
    setPublished(false);
  };

  const handleGenerate = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q) return;
    setLoading(true);
    setResult(null);
    setImageUrl(null);
    setCaption('');
    setPublished(false);
    setPublishError('');
    try {
      const data = await api.viralPhrases.generate(q, selectedCategory.id);
      setResult(data);
      setTemplate(isTaescrito ? 'taescrito' : TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]);

      // Build caption from result
      if (data.caption) {
        const tags = (data.hashtags as string[] ?? []).map((t: string) => `#${t.replace(/^#/, '')}`).join(' ');
        setCaption(`${data.caption}\n\n${tags}`);
      }

      if (data.prompt) handleGenerateImage(data.prompt);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar frase. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic: string) => {
    setQuery(topic);
    handleGenerate(topic);
  };

  const handleRandom = () => {
    const topic = SURPRISE_TOPICS[Math.floor(Math.random() * SURPRISE_TOPICS.length)];
    setQuery(topic);
    handleGenerate(topic);
  };

  const handleGenerateImage = async (prompt: string) => {
    setGeneratingImage(true);
    try {
      const { url } = await api.images.generate({ prompt });
      setImageUrl(url);
    } catch (err: any) {
      console.error(err);
    } finally {
      setGeneratingImage(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setResult((prev: any) => ({ ...prev, [field]: value }));
  };

  // Compose image on canvas at full Instagram resolution
  const composeImageForInstagram = async (): Promise<string> => {
    const { w, h } = currentFormat;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const mainText = isTaescrito ? (result.frase ?? '') : `${result.palavra_chave ?? ''}\n${result.texto_pos_titulo ?? ''}`;
    const cx = w / 2;

    if (isTaescrito && paperStyle) {
      // ── Modo Papel ───────────────────────────────────────────────────────
      // Fundo off-white com textura sutil
      ctx.fillStyle = '#eeeae4';
      ctx.fillRect(0, 0, w, h);

      // Ruído leve para textura de papel
      const imgData = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 18;
        imgData.data[i]     = Math.min(255, Math.max(0, imgData.data[i]     + noise));
        imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
        imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      // Carregar fonte Caveat Bold (handwritten)
      try {
        const fontFace = new FontFace('Caveat', 'url(https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9eIWpZA.woff2)', { weight: '700' });
        await fontFace.load();
        document.fonts.add(fontFace);
      } catch { /* usa fallback */ }

      const fontSize = Math.round(w * 0.095);
      const lineH = Math.round(fontSize * 1.15);
      const maxW = w - Math.round(w * 0.18);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#141414';
      ctx.font = `700 ${fontSize}px "Caveat", "Permanent Marker", cursive`;

      // Word-wrap
      const words = mainText.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);

      const blockH = lines.length * lineH;
      let ty = h / 2 - blockH / 2 + lineH / 2;

      for (const l of lines) { ctx.fillText(l, cx, ty); ty += lineH; }

      // Attribution
      const attrSize = Math.round(w * 0.022);
      ctx.font = `400 ${attrSize}px "Caveat", monospace`;
      ctx.fillStyle = '#888880';
      ctx.fillText('@taescrito.ai', cx, ty + attrSize * 2);

    } else {
      // ── Modo Escuro (com imagem de fundo) ────────────────────────────────
      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
        });
        const scale = Math.max(w / img.width, h / img.height);
        const sw = img.width * scale; const sh = img.height * scale;
        ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      } else {
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
      }

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.25)');
      grad.addColorStop(0.4, 'rgba(0,0,0,0.45)');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      const fontSize = Math.round(w * 0.038);
      const lineH = Math.round(fontSize * 1.7);
      const maxW = w - Math.round(w * 0.14);

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `300 ${fontSize}px Georgia, "Times New Roman", serif`;

      const paragraphs = mainText.split('\n');
      const lines: string[] = [];
      for (const para of paragraphs) {
        const words = para.split(' '); let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
          else line = test;
        }
        if (line) lines.push(line);
      }

      const blockH = lines.length * lineH;
      let ty = h / 2 - blockH / 2 + lineH / 2;
      const lineW = Math.round(w * 0.06);

      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - lineW, ty - lineH * 0.9); ctx.lineTo(cx + lineW, ty - lineH * 0.9); ctx.stroke();

      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 20;
      for (const l of lines) { ctx.fillText(l, cx, ty); ty += lineH; }
      ctx.shadowBlur = 0;

      ctx.beginPath(); ctx.moveTo(cx - lineW, ty - lineH * 0.3); ctx.lineTo(cx + lineW, ty - lineH * 0.3); ctx.stroke();

      const attrSize = Math.round(w * 0.018);
      ctx.font = `300 ${attrSize}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillText('@taescrito.ai', cx, ty + attrSize * 2.5);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handlePublish = async () => {
    if (!imageUrl || !result) return;
    setPublishing(true);
    setPublishError('');
    try {
      const base64 = await composeImageForInstagram();
      const { url } = await api.viralPhrases.uploadImage(base64);

      if (scheduleMode && scheduledAt) {
        await api.viralPhrases.schedule(url, caption, new Date(scheduledAt).toISOString());
      } else {
        await api.instagram.uploadPhoto(url, caption);
      }
      setPublished(true);
    } catch (err: any) {
      setPublishError(err.message ?? 'Erro ao publicar no Instagram');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl || !result) return;
    try {
      const base64 = await composeImageForInstagram();
      const a = document.createElement('a');
      a.href = base64;
      a.download = `taescrito_${Date.now()}.jpg`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-ai-primary/10 border border-ai-primary/20 text-ai-primary mb-2">
          <Quote className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">Post de Frases Virais</h2>
        <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
          Escolha uma categoria e gere posts prontos para postar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/8 max-w-xs mx-auto">
        <button
          onClick={() => setActiveTab('criar')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'criar' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <Zap className="w-4 h-4" /> Criar
        </button>
        <button
          onClick={() => setActiveTab('agendados')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'agendados' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <CalendarClock className="w-4 h-4" />
          Agendados
          {scheduledPosts.filter(p => p.status === 'pending').length > 0 && (
            <span className="w-4 h-4 rounded-full bg-ai-primary text-[9px] font-black flex items-center justify-center text-white">
              {scheduledPosts.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Agendados */}
      {activeTab === 'agendados' && (
        <ScheduledPostsView
          posts={scheduledPosts}
          loading={loadingScheduled}
          onRefresh={loadScheduled}
          onCancel={handleCancelScheduled}
        />
      )}

      {/* Tab: Criar */}
      {activeTab === 'criar' && <>

      {/* Category Selector */}
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Botão surpresa global — não é categoria */}
        <button
          onClick={handleRandom}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 transition-all disabled:opacity-40 bg-white/[0.02]"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🎲</span>}
          Surpresa
        </button>

        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                isActive
                  ? `bg-gradient-to-r ${cat.gradient} ${cat.taescrito ? 'text-black' : 'text-white'} shadow-lg ${cat.glow} scale-105`
                  : 'bg-white/[0.04] border border-white/10 text-gray-500 hover:text-gray-200 hover:bg-white/[0.07] hover:border-white/20'
              }`}
            >
              {cat.taescrito ? <span className="font-mono tracking-tight">✍️ taescrito.ai</span> : <span>{cat.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Format Selector */}
      <div className="flex gap-2 justify-center">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest self-center mr-2">Formato</span>
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              format === f.id
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/[0.02] border-white/5 text-gray-600 hover:text-gray-300 hover:border-white/15'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[9px] opacity-50">{f.id}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="max-w-2xl mx-auto space-y-3">
        {isTaescrito && (
          <>
            <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-xs text-gray-500 font-mono leading-relaxed">
                <span className="text-white/50">@taescrito.ai</span> — frases que você pensa mas não fala. Ironia seca. Duplo sentido.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Botão aleatório em destaque */}
              <button
                onClick={handleRandom}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-gray-200 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🎲'} aleatório
              </button>
              {TAESCRITO_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-gray-500 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-40"
                >
                  {topic}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="relative group">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder={selectedCategory.placeholder}
            className={`w-full border-2 rounded-3xl py-4 sm:py-5 px-5 sm:px-8 text-sm font-medium focus:border-ai-primary/50 transition-all outline-none pr-24 sm:pr-32 placeholder:text-gray-700 ${
              isTaescrito ? 'bg-white/[0.04] border-white/10 font-mono text-sm' : 'bg-black/40 border-white/5'
            }`}
          />
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !query}
            className={`absolute right-2 bottom-2 top-2 px-4 sm:px-6 text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale text-sm bg-gradient-to-r ${selectedCategory.gradient} ${isTaescrito ? 'text-black' : 'text-white'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /><span className="hidden xs:inline">Criar</span></>}
          </button>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 pt-4"
          >
            {/* Left: editor + caption */}
            <div className="space-y-6">
              {isTaescrito
                ? <TaescritoEditor result={result} onChange={updateField} paperStyle={paperStyle} onToggleStyle={() => setPaperStyle(p => !p)} />
                : <StandardEditor result={result} template={template} templates={TEMPLATES} onChange={updateField} onTemplateChange={setTemplate} />
              }

              {/* Caption Editor */}
              {caption && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" /> Legenda do Post
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(caption)}
                      className="flex items-center gap-1.5 text-[10px] text-ai-primary hover:underline"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={8}
                    className="w-full bg-white/[0.02] border border-white/8 rounded-2xl px-4 py-3 text-sm text-gray-300 focus:border-ai-primary/40 outline-none transition-all resize-none leading-relaxed font-mono text-xs"
                  />
                </div>
              )}

              {/* Publish Button */}
              {imageUrl && !generatingImage && (
                <div className="space-y-3">
                  {published ? (
                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">{scheduleMode ? 'Post agendado!' : 'Publicado no Instagram!'}</p>
                        <p className="text-xs text-emerald-500/70">
                          {scheduleMode && scheduledAt
                            ? `Será publicado em ${new Date(scheduledAt).toLocaleString('pt-BR')}`
                            : 'Post enviado com sucesso'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Toggle publicar agora / agendar */}
                      <div className="flex rounded-2xl bg-white/[0.03] border border-white/8 p-1 gap-1">
                        <button
                          onClick={() => setScheduleMode(false)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${!scheduleMode ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                          Publicar agora
                        </button>
                        <button
                          onClick={() => setScheduleMode(true)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${scheduleMode ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                          Agendar
                        </button>
                      </div>

                      {/* Datetime picker */}
                      {scheduleMode && (
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-300 focus:border-ai-primary/50 outline-none transition-all"
                        />
                      )}

                      <button
                        onClick={handlePublish}
                        disabled={publishing || (scheduleMode && !scheduledAt)}
                        className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                      >
                        {publishing ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> {scheduleMode ? 'Agendando...' : 'Publicando...'}</>
                        ) : scheduleMode ? (
                          <><Send className="w-5 h-5" /> Agendar post</>
                        ) : (
                          <><Instagram className="w-5 h-5" /> Publicar no Instagram</>
                        )}
                      </button>
                    </>
                  )}
                  {publishError && <p className="text-xs text-rose-400 px-2">{publishError}</p>}
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="flex flex-col items-center gap-4">
              {/* Instagram format preview */}
              <div
                ref={previewRef}
                className={`relative w-full max-w-[300px] ${currentFormat.aspect} rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-white/10`}
              >
                {generatingImage ? (
                  <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-ai-primary/20 border-t-ai-primary animate-spin" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">Criando Visual...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img src={imageUrl} className="w-full h-full object-cover absolute inset-0" alt="Post" />
                    {isTaescrito
                      ? paperStyle
                        ? <TaescritoPaperOverlay frase={result.frase} />
                        : <TaescritoDarkOverlay frase={result.frase} />
                      : <StandardOverlay result={result} template={template} />
                    }
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[#0D0D0E] flex flex-col items-center justify-center gap-4 text-gray-700">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando Tema</span>
                  </div>
                )}
              </div>

              {/* Format label */}
              <p className="text-[10px] text-gray-600 font-mono">{currentFormat.label} · {currentFormat.w}×{currentFormat.h}px</p>

              <div className="flex gap-3">
                <button
                  onClick={() => result?.prompt && handleGenerateImage(result.prompt)}
                  disabled={generatingImage}
                  className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingImage ? 'animate-spin' : ''}`} />
                  Novo Visual
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>}
    </div>
  );
}

// ─── View de posts agendados ──────────────────────────────────────────────────

function ScheduledPostsView({ posts, loading, onRefresh, onCancel }: {
  posts: any[];
  loading: boolean;
  onRefresh: () => void;
  onCancel: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Carregando agendamentos...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-700">
        <CalendarClock className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">Nenhum post agendado ainda.</p>
        <p className="text-xs text-gray-600">Crie um post e escolha "Agendar" para vê-lo aqui.</p>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    pending:   { icon: <Clock className="w-3.5 h-3.5" />,     label: 'Agendado',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    published: { icon: <CheckCheck className="w-3.5 h-3.5" />, label: 'Publicado', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    failed:    { icon: <XCircle className="w-3.5 h-3.5" />,    label: 'Falhou',    cls: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="space-y-3">
        {posts.map((post) => {
          const cfg = statusConfig[post.status] ?? statusConfig.pending;
          const scheduled = new Date(post.scheduled_at);
          const isPast = scheduled < new Date();

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/12 transition-all"
            >
              {/* Thumbnail */}
              <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-white/[0.03]">
                {post.image_url && (
                  <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {post.caption?.split('\n')[0] ?? '—'}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status badge */}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                    {cfg.icon} {cfg.label}
                  </span>

                  {/* Scheduled time */}
                  <span className="text-[10px] text-gray-600">
                    {isPast && post.status === 'pending' ? '⚠️ ' : ''}
                    {scheduled.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {' · '}
                    {scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {post.status === 'failed' && post.error_message && (
                  <p className="text-[10px] text-rose-500 leading-tight">{post.error_message}</p>
                )}

                {post.status === 'published' && post.instagram_post_url && (
                  <a href={post.instagram_post_url} target="_blank" rel="noreferrer"
                    className="text-[10px] text-ai-primary hover:underline">
                    Ver no Instagram →
                  </a>
                )}
              </div>

              {/* Cancel button */}
              {post.status === 'pending' && (
                <button
                  onClick={() => onCancel(post.id)}
                  className="self-start p-2 rounded-xl text-gray-700 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                  title="Cancelar agendamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── taescrito.ai overlay (paper mode) ───────────────────────────────────────

function TaescritoPaperOverlay({ frase }: { frase: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center"
      style={{ background: '#eeeae4' }}>
      <motion.p
        key={frase}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: '"Caveat", "Permanent Marker", cursive',
          fontSize: 'clamp(1.3rem, 7vw, 2.2rem)',
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#141414',
          letterSpacing: '-0.01em',
        }}
      >
        {frase}
      </motion.p>
      <p className="mt-6" style={{
        fontFamily: '"Caveat", monospace',
        fontSize: '0.65rem',
        color: '#999990',
        letterSpacing: '0.08em',
      }}>
        @taescrito.ai
      </p>
    </div>
  );
}

// ─── taescrito.ai overlay (dark mode) ────────────────────────────────────────

function TaescritoDarkOverlay({ frase }: { frase: string }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/50 to-black/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/20" />
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="flex-1 h-px bg-white/20" />
        </div>
        <motion.p
          key={frase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '0.88rem',
            fontWeight: 300,
            lineHeight: 1.7,
            letterSpacing: '0.015em',
            color: 'rgba(255,255,255,0.96)',
            textShadow: '0 1px 18px rgba(0,0,0,0.95)',
          }}
        >
          {frase}
        </motion.p>
        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 h-px bg-white/20" />
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="flex-1 h-px bg-white/20" />
        </div>
        <p className="mt-3" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '8px', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>
          @taescrito.ai
        </p>
      </div>
    </>
  );
}

// ─── taescrito.ai editor ──────────────────────────────────────────────────────

function TaescritoEditor({ result, onChange, paperStyle, onToggleStyle }: {
  result: any;
  onChange: (f: string, v: string) => void;
  paperStyle: boolean;
  onToggleStyle: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white" />
          <span className="font-mono text-sm font-bold text-white">taescrito.ai</span>
        </div>
        {/* Toggle estilo */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => !paperStyle && onToggleStyle()}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${paperStyle ? 'bg-[#eeeae4] text-black' : 'text-gray-600 hover:text-gray-300'}`}
          >
            Papel
          </button>
          <button
            onClick={() => paperStyle && onToggleStyle()}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${!paperStyle ? 'bg-white/15 text-white' : 'text-gray-600 hover:text-gray-300'}`}
          >
            Escuro
          </button>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          <Type className="w-3.5 h-3.5" /> A Frase
        </span>
        <textarea
          value={result.frase || ''}
          onChange={(e) => onChange('frase', e.target.value)}
          rows={4}
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-base font-light text-white focus:border-white/30 outline-none transition-all resize-none font-mono leading-relaxed"
        />
      </div>
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" /> Cena de Fundo
        </span>
        <p className="text-[11px] text-gray-500 leading-relaxed">{result.tema_visual}</p>
      </div>
    </div>
  );
}

// ─── Standard editor ──────────────────────────────────────────────────────────

function StandardEditor({ result, template, templates, onChange, onTemplateChange }: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-ai-primary uppercase tracking-[0.2em]">Design Ativo</span>
          <h3 className="text-xl font-bold capitalize">{template} Style</h3>
        </div>
        <button onClick={() => onTemplateChange(templates[(templates.indexOf(template) + 1) % templates.length])} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3 p-5 rounded-3xl bg-white/[0.02] border border-white/5">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Conteúdo</span>
        {[
          { key: 'texto_pre_titulo', label: 'Pré-Título' },
          { key: 'palavra_chave',    label: 'Palavra-Chave' },
          { key: 'texto_pos_titulo', label: 'Mensagem', multi: true },
          { key: 'referencia',       label: 'Referência' },
        ].map(({ key, label, multi }: any) => (
          <div key={key} className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase px-1">{label}</label>
            {multi ? (
              <textarea value={result[key] || ''} onChange={(e) => onChange(key, e.target.value)} rows={2} className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all resize-none" />
            ) : (
              <input value={result[key] || ''} onChange={(e) => onChange(key, e.target.value)} className={`w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all ${key === 'palavra_chave' ? 'font-bold text-ai-primary uppercase' : ''}`} />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1"><span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Cores</span><p className="text-[10px] text-gray-500">{result.cores}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1"><span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Cena</span><p className="text-[10px] text-gray-500 line-clamp-2">{result.tema_visual}</p></div>
      </div>
    </div>
  );
}

// ─── Standard overlay ─────────────────────────────────────────────────────────

function StandardOverlay({ result, template }: any) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
      <div className="absolute inset-0 p-8 flex flex-col justify-end text-center pb-16">
        <motion.div key={template} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={`${template === 'bold' ? 'text-left' : 'text-center'}`}>
          {template === 'classic' && (<><p className="text-lg text-white font-premium-serif italic mb-1">{result.texto_pre_titulo}</p><h4 className="text-6xl font-bold text-gold uppercase tracking-tighter mb-2 font-premium-display leading-none">{result.palavra_chave}</h4><p className="text-base text-white font-premium-serif leading-tight px-4 opacity-90">{result.texto_pos_titulo}</p><div className="py-4 flex flex-col items-center gap-2"><div className="h-[0.5px] w-24 bg-gradient-to-r from-transparent via-[#E2B04A]/40 to-transparent" /><Sparkles className="w-3 h-3 text-[#E2B04A] opacity-60" /><div className="h-[0.5px] w-24 bg-gradient-to-r from-transparent via-[#E2B04A]/40 to-transparent" /></div></>)}
          {template === 'minimal' && (<><p className="text-sm text-white/60 font-medium uppercase tracking-[0.2em] mb-3">{result.texto_pre_titulo}</p><h4 className="text-4xl font-light text-white mb-4 tracking-wide">{result.palavra_chave}</h4><p className="text-lg text-white font-light italic leading-relaxed">{result.texto_pos_titulo}</p><div className="h-8" /></>)}
          {template === 'bold' && (<div className="space-y-4"><h4 className="text-5xl font-black text-white uppercase leading-[0.9] border-l-4 border-ai-primary pl-4">{result.palavra_chave}</h4><p className="text-xl font-bold text-white/90 leading-tight pl-4">{result.texto_pos_titulo}</p><p className="text-[10px] text-ai-primary font-black uppercase tracking-widest pl-4">{result.referencia}</p></div>)}
          {template === 'elegant' && (<><div className="mb-6 opacity-30"><Quote className="w-8 h-8 mx-auto" /></div><h4 className="text-3xl font-premium-serif italic text-white/90 mb-4 px-2 leading-tight">"{result.texto_pre_titulo} {result.palavra_chave} {result.texto_pos_titulo}"</h4><div className="w-12 h-[2px] bg-white/20 mx-auto mb-4" /></>)}
          {template === 'handwritten' && (<div className="text-center px-4 space-y-2"><p className="text-4xl font-premium-script text-white/90 leading-tight drop-shadow-lg">{result.texto_pre_titulo} {result.palavra_chave}</p><p className="text-4xl font-premium-script text-white/90 leading-tight drop-shadow-lg">{result.texto_pos_titulo}</p><div className="h-6" /></div>)}
          {template === 'magazine' && (<div className="text-left px-2 space-y-1"><h4 className="text-[80px] font-black font-premium-sans text-white uppercase leading-[0.8] tracking-tighter">{result.palavra_chave}</h4><div className="h-1 w-20 bg-ai-primary mb-4" /><p className="text-xl font-medium font-premium-sans text-white/80 uppercase tracking-widest leading-none">{result.texto_pre_titulo}</p><p className="text-sm font-light font-premium-sans text-white/60 uppercase tracking-[0.3em]">{result.texto_pos_titulo}</p></div>)}
          {template !== 'bold' && template !== 'magazine' && result.referencia && (
            <p className={`text-[9px] font-bold uppercase tracking-[0.4em] opacity-70 ${template === 'classic' ? 'text-[#E2B04A]' : template === 'handwritten' ? 'text-white/50 italic' : 'text-white'}`}>{result.referencia}</p>
          )}
          {template === 'magazine' && result.referencia && (
            <div className="pt-8 flex justify-end"><p className="text-[10px] font-black font-premium-sans text-ai-primary uppercase tracking-[0.5em] border-b border-ai-primary/30 pb-1">{result.referencia}</p></div>
          )}
        </motion.div>
      </div>
    </>
  );
}
