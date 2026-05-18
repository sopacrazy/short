import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic2,
  Music,
  RefreshCw,
  Play,
  CheckCircle,
  Loader2,
  ChevronRight,
  Upload,
  Folder,
  Globe,
  Clapperboard,
  Terminal,
  Type,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  X,
  ZoomIn,
} from 'lucide-react';
import { api, type ApiProject, type ApiScene, type Voice, type ApiFolder } from '../lib/api';

interface Step3ProductionProps {
  project: { projectId: string; [key: string]: any };
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Production({ project: projectCtx, onNext, onBack }: Step3ProductionProps) {
  const [project, setProject] = useState<ApiProject | null>(null);
  const [scenes, setScenes] = useState<ApiScene[] | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [folder, setFolder] = useState<ApiFolder | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isRegeneratingScene, setIsRegeneratingScene] = useState<string | null>(null);
  const [isUploadingScene, setIsUploadingScene] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeLightbox]);
  const [endCardUrl, setEndCardUrl] = useState<string | null>(null);
  const [isUploadingEndCard, setIsUploadingEndCard] = useState(false);

  useEffect(() => { loadData(); }, [projectCtx.projectId]);

  const loadData = async () => {
    try {
      const data = await api.projects.get(projectCtx.projectId);
      console.log('DEBUG - Projeto:', data.project);
      console.log('DEBUG - Cenas do Banco:', data.scenes);
      
      setProject(data.project);
      setScenes(data.scenes);
      setVoices(await api.narration.voices());
      if (data.metadata?.end_card_url) setEndCardUrl(data.metadata.end_card_url);
      if (data.project.folder_id) {
        const f = await api.folders.get(data.project.folder_id);
        setFolder(f);
        if (f.default_voice_id) setSelectedVoice(f.default_voice_id);
      }
      // Busca traduções em background (não bloqueia o carregamento)
      if (data.scenes.length > 0) {
        api.translate(data.scenes.map(s => s.description))
          .then(({ translations: t }) => {
            const map: Record<string, string> = {};
            data.scenes.forEach((s, i) => { if (t[i]) map[s.id] = t[i]; });
            setTranslations(map);
          })
          .catch(() => { /* silencioso se falhar */ });
      }
    } catch (err) { console.error('Erro ao carregar dados:', err); }
  };

  const getFullImageUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${api.getBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleRegenerateAllImages = async () => {
    setIsGeneratingImages(true);
    try {
      const stream = api.images.generateStream(projectCtx.projectId);
      for await (const event of stream) {
        if (event.type === 'scene_done' && event.image_url && event.scene_id) {
          setScenes(prev => prev ? prev.map(s => s.id === event.scene_id ? { ...s, image_url: event.image_url! } : s) : null);
        }
      }
    } catch (err) { console.error(err); }
    finally { setIsGeneratingImages(false); }
  };

  const handleRegenerateSingleScene = async (sceneId: string) => {
    setIsRegeneratingScene(sceneId);
    try {
      const updatedScene = await api.images.regenerate(projectCtx.projectId, sceneId);
      setScenes(prev => prev ? prev.map(s => s.id === sceneId ? updatedScene : s) : null);
    } catch (err) { console.error(err); }
    finally { setIsRegeneratingScene(null); }
  };

  const handleSceneImageUpload = (sceneId: string, file: File) => {
    setIsUploadingScene(sceneId);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const updatedScene = await api.images.upload(projectCtx.projectId, sceneId, base64, file.type);
        setScenes(prev => prev ? prev.map(s => s.id === sceneId ? updatedScene : s) : null);
      } catch (err) {
        console.error('[Upload imagem]', err);
      } finally {
        setIsUploadingScene(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEndCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEndCard(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { url } = await api.projects.uploadEndCard(projectCtx.projectId, base64, file.type);
        setEndCardUrl(url);
      };
      reader.readAsDataURL(file);
    } catch (err) { console.error(err); }
    finally { setIsUploadingEndCard(false); }
  };

  const handleFinalize = async () => {
    setIsGeneratingNarration(true);
    try {
      await api.narration.generate(projectCtx.projectId, selectedVoice);
      await api.music.save(projectCtx.projectId, '/api/static/suspense.mp3', 0.12);
      onNext();
    } catch (err) { console.error(err); }
    finally { setIsGeneratingNarration(false); }
  };

  if (!scenes || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-gray-500">
        <Sparkles className="w-10 h-10 animate-pulse mb-4 text-ai-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Carregando estúdio de produção...</p>
      </div>
    );
  }

  const allImagesReady = (scenes || []).every(s => s.image_url);
  const narrationReady = !!selectedVoice;

  return (
    <>
    {/* Lightbox */}
    <AnimatePresence>
      {lightboxUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={closeLightbox}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative max-h-[90vh] max-w-[420px] w-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt=""
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
              style={{ maxHeight: '90vh' }}
            />
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 sm:pb-32 px-4 sm:px-6">
      {/* Folder Context Banner */}
      {folder && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 border-ai-primary/20 bg-ai-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-ai-primary/10 flex items-center justify-center text-ai-primary">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-ai-primary uppercase tracking-widest">Canal: <span className="text-white">{folder.name}</span></p>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="text-[9px] text-gray-500 font-bold uppercase flex items-center gap-1"><Mic2 className="w-3 h-3" /> {voices.find(v => v.voice_id === folder.default_voice_id)?.name || 'Padrão'}</span>
                <span className="text-[9px] text-gray-500 font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3" /> {folder.default_language || 'pt'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Revisão de Produção</h2>
          <p className="text-gray-500 text-sm mt-1">Valide as cenas antes de gerar o preview final.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button onClick={handleRegenerateAllImages} disabled={isGeneratingImages}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${isGeneratingImages ? 'animate-spin' : ''}`} />
            Gerar Imagens
          </button>
          <button onClick={onBack} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Voltar</button>
          <button
            onClick={handleFinalize}
            disabled={!allImagesReady || !narrationReady || isGeneratingNarration}
            className="px-6 sm:px-10 py-2.5 sm:py-4 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
          >
            {isGeneratingNarration ? <Sparkles className="w-5 h-5 animate-pulse" /> : <span>Gerar Preview</span>}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-4">
          {scenes.map((scene, idx) => (
            <div key={scene.id} className="group glass-card overflow-hidden hover:border-ai-primary/20 transition-all duration-300">
              {/* Mobile: imagem em cima + conteúdo embaixo / Desktop: lado a lado */}
              <div className="flex flex-col sm:flex-row sm:gap-6 sm:p-6">

                {/* Thumbnail */}
                <div className="sm:w-36 sm:flex-shrink-0">
                  {/* Mobile: imagem em banner horizontal */}
                  <div className="sm:hidden relative w-full aspect-[16/9] bg-[#0A0A0B] overflow-hidden">
                    {scene.image_url ? (
                      <img
                        src={getFullImageUrl(scene.image_url)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                        alt=""
                        onClick={() => setLightboxUrl(getFullImageUrl(scene.image_url))}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                        {isGeneratingImages
                          ? <><Sparkles className="w-6 h-6 animate-pulse text-ai-primary" /><span className="text-[8px] font-bold text-ai-primary uppercase">Gerando...</span></>
                          : <><ImageIcon className="w-6 h-6 text-gray-800" /><span className="text-[8px] font-bold text-gray-800 uppercase">Aguardando</span></>
                        }
                      </div>
                    )}
                    {isRegeneratingScene === scene.id && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Sparkles className="w-6 h-6 animate-pulse text-ai-primary" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/5">CENA {idx + 1}</div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-sm text-[10px] font-bold text-gray-300 hover:bg-white/20 hover:text-white transition-all border border-white/10 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSceneImageUpload(scene.id, f); e.target.value = ''; }} />
                        {isUploadingScene === scene.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      </label>
                      <button
                        onClick={() => handleRegenerateSingleScene(scene.id)}
                        disabled={!!isRegeneratingScene || !!isUploadingScene}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-sm text-[10px] font-bold text-gray-300 hover:bg-ai-primary hover:text-white transition-all border border-white/10 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRegeneratingScene === scene.id ? 'animate-spin' : ''}`} />
                        Regenerar
                      </button>
                    </div>
                  </div>

                  {/* Desktop: imagem vertical */}
                  <div className="hidden sm:block w-36 aspect-[9/16] bg-[#0A0A0B] border border-white/5 rounded-2xl overflow-hidden relative shadow-2xl group/img">
                    {scene.image_url ? (
                      <>
                        <img
                          src={getFullImageUrl(scene.image_url)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                          alt=""
                          onClick={() => setLightboxUrl(getFullImageUrl(scene.image_url))}
                        />
                        <div
                          onClick={() => setLightboxUrl(getFullImageUrl(scene.image_url))}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/30 cursor-zoom-in"
                        >
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                        {isGeneratingImages
                          ? <><Sparkles className="w-6 h-6 animate-pulse text-ai-primary" /><span className="text-[8px] font-bold text-ai-primary uppercase">Gerando...</span></>
                          : <><ImageIcon className="w-6 h-6 text-gray-800" /><span className="text-[8px] font-bold text-gray-800 uppercase">Aguardando Geração</span></>
                        }
                      </div>
                    )}
                    {isRegeneratingScene === scene.id && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Sparkles className="w-6 h-6 animate-pulse text-ai-primary" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/5 shadow-lg">CENA {idx + 1}</div>
                  </div>
                </div>

                {/* Textual Content */}
                <div className="flex-1 flex flex-col justify-between p-4 sm:p-0 sm:py-1">
                  <div className="space-y-3 sm:space-y-5">
                    {/* Caption */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-ai-primary uppercase tracking-[0.2em]">
                        <Type className="w-3.5 h-3.5" /> Legenda do Vídeo
                      </div>
                      <p className="text-sm sm:text-lg text-gray-100 font-medium leading-relaxed font-display">
                        "{scene.description}"
                      </p>
                      {translations[scene.id] ? (
                        <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-white/10 pl-3 italic">
                          🇧🇷 {translations[scene.id]}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-700 italic">🇧🇷 Traduzindo...</p>
                      )}
                    </div>

                  </div>

                  {/* Actions — só desktop (mobile tem botão na imagem) */}
                  <div className="hidden sm:flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-4">
                    <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-[10px] font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest border border-white/5 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSceneImageUpload(scene.id, f); e.target.value = ''; }}
                      />
                      {isUploadingScene === scene.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Enviar Imagem
                    </label>
                    <button
                      onClick={() => handleRegenerateSingleScene(scene.id)}
                      disabled={!!isRegeneratingScene || !!isUploadingScene}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-[10px] font-bold text-gray-400 hover:bg-ai-primary hover:text-white transition-all uppercase tracking-widest border border-white/5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingScene === scene.id ? 'animate-spin' : ''}`} />
                      Regenerar Imagem
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* End Card CTA */}
          <div className={`glass-card p-8 flex gap-8 border-dashed border-white/10 bg-transparent ${endCardUrl ? 'border-ai-primary/20 bg-ai-primary/5' : ''}`}>
             <label className="w-40 aspect-[9/16] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden relative flex-shrink-0 hover:border-white/20 transition-all shadow-2xl">
                <input type="file" className="hidden" accept="image/*" onChange={handleEndCardUpload} />
                {isUploadingEndCard ? (
                  <Sparkles className="w-6 h-6 animate-pulse text-ai-primary" />
                ) : endCardUrl ? (
                  <img src={getFullImageUrl(endCardUrl)} className="w-full h-full object-cover" alt="CTA" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-700" />
                )}
             </label>
             <div className="flex-1 flex flex-col justify-center space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Encerramento (CTA)</h4>
                  <p className="text-sm text-gray-500 max-w-md leading-relaxed">Personalize o final do seu vídeo com uma imagem de chamada para ação. Ideal para logotipos ou convites para inscrição.</p>
                </div>
                <div className="flex items-center gap-4">
                   <label className="btn-primary px-6 py-3 rounded-xl text-xs font-bold cursor-pointer hover:scale-105 transition-all">
                      <input type="file" className="hidden" accept="image/*" onChange={handleEndCardUpload} />
                      {endCardUrl ? 'Substituir CTA' : 'Fazer Upload'}
                   </label>
                   {endCardUrl && <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> Concluído</span>}
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-8">
          <div className="glass-card p-6 border-ai-primary/20 bg-ai-primary/5 space-y-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Music className="w-4 h-4" />
                Trilha Sonora
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ai-primary text-white shadow-lg shadow-ai-primary/20">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Suspense Cinematic</h4>
                  <p className="text-[8px] opacity-70 uppercase font-bold tracking-widest">Padrão Ativo</p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-white/5" />

            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Dica de Revisão
              </h3>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Certifique-se de que o <strong>Prompt</strong> reflete bem a <strong>Legenda</strong>. Se a imagem não ficou boa, clique em "Regenerar" para tentar uma nova versão.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
