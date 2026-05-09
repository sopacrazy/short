import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Image as ImageIcon, Music, Type, Palette, Film,
  Loader2, AlertCircle, RefreshCw, Mic, Play, CheckCircle, Volume2, Upload, X,
} from 'lucide-react';
import { api, type ApiScene, type Voice, type ImageGenEvent } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface Step3ProductionProps {
  project: ProjectContext;
  onNext: () => void;
  onBack: () => void;
}

const VISUAL_STYLES = [
  { id: 'cinematic', label: 'Cinematográfico' },
  { id: 'illustration', label: 'Ilustração 2D' },
  { id: 'realistic', label: 'Hiper-Realista' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
];

export default function Step3Production({ project, onNext, onBack }: Step3ProductionProps) {
  // Imagens
  const [scenes, setScenes] = useState<ApiScene[]>([]);
  const [visualStyle, setVisualStyle] = useState('cinematic');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<{ completed: number; total: number } | null>(null);

  // Narração
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [narrationDone, setNarrationDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [endCardUrl, setEndCardUrl] = useState<string | null>(null);
  const [isUploadingEndCard, setIsUploadingEndCard] = useState(false);

  // Trilha sonora (Fixa conforme pedido)
  const [soundtrackEnabled, setSoundtrackEnabled] = useState(true);
  const DEFAULT_SOUNDTRACK_URL = 'http://localhost:3001/api/static/suspense.mp3';

  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Carrega cenas e narração existente
    api.projects.get(project.projectId).then(data => {
      if (data.scenes.length > 0) setScenes(data.scenes);
      if (data.narration && (data.narration as { audio_url?: string }).audio_url) {
        setAudioUrl((data.narration as { audio_url: string }).audio_url);
        setNarrationDone(true);
      }
      if (data.metadata?.end_card_url) setEndCardUrl(data.metadata.end_card_url);
      
      // Sempre garante que a trilha padrão está salva no projeto
      if (!data.metadata?.soundtrack_url) {
        api.music.save(project.projectId, DEFAULT_SOUNDTRACK_URL, 0.22);
      }
    }).catch(() => {});

    // Carrega vozes disponíveis
    api.narration.voices().then((v) => {
      const list = v as Voice[];
      setVoices(list);
      const preferred = project.defaultVoiceId && list.find(x => x.voice_id === project.defaultVoiceId);
      setSelectedVoice(preferred ? preferred.voice_id : (list[0]?.voice_id ?? ''));
    }).catch(() => {
      setVoices([{ voice_id: 'default', name: 'Voz Padrão', preview_url: undefined }]);
      setSelectedVoice('default');
    });

    // Garante que a página comece no topo
    window.scrollTo(0, 0);
  }, [project.projectId]);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageUpload = async (sceneId: string, file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const updated = await api.images.upload(project.projectId, sceneId, base64, file.type);
        setScenes(prev => prev.map(s => s.id === updated.id ? updated : s));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fazer upload da imagem');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImages = async () => {
    setIsGeneratingImages(true);
    setError(null);
    setImageProgress(null);
    setImageStatus('Conectando ao Flux AI...');
    try {
      for await (const evt of api.images.generateStream(project.projectId, visualStyle)) {
        handleImageEvent(evt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagens');
    } finally {
      setIsGeneratingImages(false);
      setImageProgress(null);
      setImageStatus(null);
    }
  };

  const handleImageEvent = (evt: ImageGenEvent) => {
    if (evt.type === 'started') {
      setImageStatus(`Gerando ${evt.total} imagens com IA...`);
      setImageProgress({ completed: 0, total: evt.total ?? 0 });
    } else if (evt.type === 'generating') {
      setImageStatus(`Cena ${evt.scene_number} de ${evt.total}...`);
      setImageProgress({ completed: evt.completed ?? 0, total: evt.total ?? 0 });
    } else if (evt.type === 'scene_done') {
      // Atualiza cena na lista local com a imagem recém gerada
      if (evt.scene_id && evt.image_url) {
        setScenes(prev =>
          prev.map(s => s.id === evt.scene_id ? { ...s, image_url: evt.image_url! } : s)
        );
      }
      setImageProgress({ completed: evt.completed ?? 0, total: evt.total ?? 0 });
    } else if (evt.type === 'scene_error') {
      setImageProgress({ completed: evt.completed ?? 0, total: evt.total ?? 0 });
    } else if (evt.type === 'completed') {
      setImageStatus(null);
    }
  };

  const handleRegenerateScene = async (scene: ApiScene) => {
    try {
      const updated = await api.images.regenerate(project.projectId, scene.id, visualStyle);
      setScenes(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao regenerar cena');
    }
  };

  const handleGenerateNarration = async () => {
    setIsGeneratingNarration(true);
    setError(null);
    try {
      const result = await api.narration.generate(project.projectId, selectedVoice === 'default' ? undefined : selectedVoice) as { audio_url?: string };
      if (result.audio_url) {
        setAudioUrl(result.audio_url);
        setNarrationDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar narração');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // Avança para preview; se vem de pasta configurada e narração ainda não foi gerada, gera primeiro
  const handleAdvance = async () => {
    if (!narrationDone && project.defaultVoiceId && !isGeneratingNarration) {
      setIsGeneratingNarration(true);
      setError(null);
      try {
        const result = await api.narration.generate(project.projectId, selectedVoice === 'default' ? undefined : selectedVoice) as { audio_url?: string };
        if (result.audio_url) {
          setAudioUrl(result.audio_url);
          setNarrationDone(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao gerar narração');
        setIsGeneratingNarration(false);
        return;
      }
      setIsGeneratingNarration(false);
    }
    onNext();
  };

  const handleEndCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEndCard(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await api.projects.uploadEndCard(project.projectId, base64, file.type);
        setEndCardUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
      } finally {
        setIsUploadingEndCard(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const hasImages = scenes.length > 0 && scenes.some(s => s.image_url);
  const allImagesReady = scenes.length > 0 && scenes.every(s => s.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-8rem)]"
    >
      <FolderContextBanner project={project} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="text-[#00E5FF]">Etapa 3 de 5</span>
          </div>
          <h2 className="text-3xl font-display font-semibold text-balance">Elementos de Produção</h2>
        </div>
        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Coluna das cenas */}
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Film className="w-5 h-5 text-[#7B61FF]" /> Sequência Visual
            </h3>
            <div className="flex flex-col items-end gap-1">
              {hasImages && narrationDone && (
                <span className="text-[10px] text-emerald-400 font-medium mb-1 animate-fade-in">
                  ✓ Imagens e narração prontas
                </span>
              )}
              <button
                onClick={handleGenerateImages}
                disabled={isGeneratingImages || scenes.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isGeneratingImages
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{imageStatus ?? 'Gerando...'}</>
                  : <><Sparkles className="w-4 h-4" />{hasImages ? 'Regerar imagens' : 'Gerar imagens com IA'}</>
                }
              </button>
              {imageProgress && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7B61FF] to-[#00E5FF] transition-all duration-500"
                      style={{ width: `${Math.round((imageProgress.completed / imageProgress.total) * 100)}%` }}
                    />
                  </div>
                  <span>{imageProgress.completed}/{imageProgress.total}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-3xl p-5 backdrop-blur-xl">
            {scenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
                <Film className="w-10 h-10 opacity-30" />
                <p className="text-sm">Nenhuma cena encontrada. Volte e gere o roteiro.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scenes.map(scene => (
                  <SceneCard 
                    key={scene.id} 
                    scene={scene} 
                    onRegenerate={() => handleRegenerateScene(scene)} 
                    onPreview={() => scene.image_url && setPreviewImage(scene.image_url)}
                    onUpload={(file) => handleImageUpload(scene.id, file)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna de configurações */}
        <div className="lg:col-span-4 space-y-4">

          {/* Estilo Visual (Oculto por enquanto) */}
          <div className="hidden">
            <ConfigBlock icon={<Palette />} title="Estilo Visual" color="#7B61FF">
              <div className="flex flex-wrap gap-2">
                {VISUAL_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setVisualStyle(s.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      visualStyle === s.id ? 'border-[#7B61FF] bg-[#7B61FF]/10 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </ConfigBlock>
          </div>

          {/* Narração — ElevenLabs */}
          <ConfigBlock
            icon={<Mic />}
            title="Narração com IA"
            color="#00E5FF"
            badge={narrationDone ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle className="w-3 h-3" />Gerada</span> : undefined}
          >
            <div className="w-full space-y-3">
              {/* Seleção de voz */}
              {voices.length > 1 && (
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  disabled={!!project.defaultVoiceId}
                  className="w-full bg-[#1A1A1E] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF]/50 disabled:opacity-50"
                >
                  {voices.map(v => (
                    <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                  ))}
                </select>
              )}

              {/* Player de prévia se já gerado */}
              {audioUrl && (
                <div className="flex items-center gap-2 bg-[#1A1A1E] rounded-xl p-3 border border-[#00E5FF]/20">
                  <Volume2 className="w-4 h-4 text-[#00E5FF] shrink-0" />
                  <audio ref={audioRef} src={audioUrl} className="flex-1 h-6" controls />
                </div>
              )}

              {!project.defaultVoiceId ? (
                <button
                  onClick={handleGenerateNarration}
                  disabled={isGeneratingNarration}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    narrationDone
                      ? 'border border-white/10 text-gray-400 hover:bg-white/5'
                      : 'bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/20'
                  } disabled:opacity-50`}
                >
                  {isGeneratingNarration
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando com ElevenLabs...</>
                    : narrationDone
                      ? <><RefreshCw className="w-4 h-4" />Regenerar narração</>
                      : <><Mic className="w-4 h-4" />Gerar narração</>
                  }
                </button>
              ) : (
                <div className="w-full text-center text-xs text-[#00E5FF]/80 py-2 bg-[#00E5FF]/5 rounded-lg border border-[#00E5FF]/10">
                  <p>Voz predefinida pela pasta.</p>
                  <p className="mt-0.5 opacity-80">Narração automática no próximo passo.</p>
                </div>
              )}
            </div>
          </ConfigBlock>

          {/* Estilo de legenda (Oculto por enquanto) */}
          <div className="hidden">
            <ConfigBlock icon={<Type />} title="Estilo de Legenda" color="#F43F5E">
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="h-14 rounded-xl bg-[#1A1A1E] border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30">
                  <span className="font-display font-bold text-base text-white">Clássico</span>
                </div>
                <div className="h-14 rounded-xl bg-[#1A1A1E] border-2 border-[#F43F5E] flex items-center justify-center cursor-pointer relative overflow-hidden">
                  <span className="font-display font-black text-lg text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] uppercase italic z-10 w-full text-center">VIRAL!</span>
                  <div className="absolute inset-0 bg-[#F43F5E]/10" />
                </div>
              </div>
            </ConfigBlock>
          </div>

          {/* Imagem Final — End Card */}
          <ConfigBlock
            icon={<ImageIcon />}
            title="Imagem Final (End Card)"
            color="#F59E0B"
            badge={endCardUrl ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle className="w-3 h-3" />Adicionada</span> : undefined}
          >
            <div className="w-full space-y-2">
              <p className="text-xs text-gray-500 leading-relaxed">
                Aparece nos últimos 5s — ideal para logo do canal ou CTA.
              </p>
              {endCardUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#1A1A1E]">
                  <img src={endCardUrl} alt="End Card" className="w-full h-28 object-cover" />
                  <button
                    onClick={() => setEndCardUrl(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                    title="Remover"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block w-full cursor-pointer">
                  <div className="h-20 rounded-xl bg-[#1A1A1E] border-2 border-dashed border-white/10 hover:border-[#F59E0B]/50 flex items-center justify-center gap-2 text-gray-500 text-xs transition-colors">
                    {isUploadingEndCard
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                      : <><Upload className="w-4 h-4" />Clique para adicionar imagem</>
                    }
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleEndCardUpload}
                    disabled={isUploadingEndCard}
                  />
                </label>
              )}
            </div>
          </ConfigBlock>

          {/* Trilha sonora */}
          <ConfigBlock icon={<Music />} title="Trilha Sonora" color="#7B61FF">
            <div className="w-full space-y-3">
              <div className={`group flex items-center gap-3 p-3 rounded-xl border transition-all bg-[#7B61FF]/10 border-[#7B61FF]/40`}>
                <div className="w-8 h-8 rounded-full bg-[#7B61FF] text-white flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-white">suspense.mp3 (Padrão)</p>
                  <p className="text-[9px] text-gray-500">Volume reduzido (12%) para narração</p>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-[9px] text-emerald-400 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  ATIVA
                </div>
              </div>
              <p className="text-[10px] text-center text-gray-500 italic">
                A trilha será mixada automaticamente na renderização.
              </p>
            </div>
          </ConfigBlock>

          <div className="pt-4 space-y-4">
            <button
              onClick={handleAdvance}
              disabled={isGeneratingNarration || !allImagesReady}
              className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] ${
                allImagesReady 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
              }`}
            >
              {isGeneratingNarration ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>Gerando narração...</span></>
              ) : !allImagesReady ? (
                <><span>Aguardando imagens...</span></>
              ) : (
                <><span>Avançar para Preview</span><ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            <div className="text-[11px] text-gray-500 text-center">
              {!allImagesReady && <span className="text-yellow-400/80 block mb-1">⚠ Gere ou faça upload de TODAS as imagens para avançar</span>}
              {allImagesReady && !narrationDone && project.defaultVoiceId && <span className="text-[#00E5FF]/80">🎙️ Narração será gerada automaticamente ao avançar</span>}
              {allImagesReady && narrationDone && <span className="text-emerald-400/80 font-medium">✓ Imagens e narração prontas</span>}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}


      {/* Modal de Preview de Imagem */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-20 cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl" 
            />
            <button className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Componentes internos ────────────────────────────────────────────────────

function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function SceneCard({ 
  scene, onRegenerate, onPreview, onUpload 
}: { 
  scene: ApiScene; 
  onRegenerate: () => void;
  onPreview: () => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#1A1A1E] border border-[#ffffff0a] group hover:border-[#7B61FF]/30 transition-colors">
      <div className="w-full sm:w-44 h-28 rounded-xl bg-[#0A0A0B] relative overflow-hidden flex-shrink-0 border border-white/5">
        {scene.image_url ? (
          <>
            <img
              src={scene.image_url}
              alt={`Cena ${scene.scene_number}`}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105 cursor-zoom-in"
              onClick={onPreview}
            />
            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80"
                title="Regenerar imagem"
              >
                <RefreshCw className="w-3 h-3 text-white" />
              </button>
              <label className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 cursor-pointer">
                <Upload className="w-3 h-3 text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} 
                />
              </label>
            </div>
          </>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-600 cursor-pointer hover:bg-white/5 transition-colors">
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">Upload imagem</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} 
            />
          </label>
        )}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white">C{scene.scene_number}</div>
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-emerald-400">{scene.duration_seconds}s</div>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <p className="text-sm font-medium text-white line-clamp-2 mb-2">"{scene.description}"</p>
        <div>
          <p className="text-[10px] font-semibold text-[#7B61FF] uppercase tracking-wider flex items-center gap-1 mb-1">
            <ImageIcon className="w-3 h-3" /> Prompt
          </p>
          <p className="text-xs text-gray-500 font-mono leading-relaxed line-clamp-2 bg-black/30 p-2 rounded-lg border border-white/5">
            {scene.image_prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfigBlock({
  icon, title, color, children, badge,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
          <span style={{ color }}>{icon}</span> {title}
        </h4>
        {badge}
      </div>
      {children}
    </div>
  );
}
