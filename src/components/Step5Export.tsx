import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Download, Youtube, Share2, Copy, Rocket, Hash, AlignLeft, Loader2, Video, ExternalLink, Calendar } from 'lucide-react';
import { api, type ApiMetadata, type ApiScene } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface Step5ExportProps {
  project: ProjectContext;
  onFinish: () => void;
  onBack: () => void;
}

export default function Step5Export({ project, onFinish, onBack }: Step5ExportProps) {
  const [metadata, setMetadata] = useState<ApiMetadata | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ytConnected, setYtConnected] = useState(false);
  const [ytChecked, setYtChecked] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Instagram States
  const [instaConnected, setInstaConnected] = useState(false);
  const [isPublishingInsta, setIsPublishingInsta] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [instaError, setInstaError] = useState<string | null>(null);
  const [instaSuccess, setInstaSuccess] = useState(false);

  // Folder/Multi-publish states
  const [folderConfig, setFolderConfig] = useState<{yt: boolean, insta: boolean} | null>(null);
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  useEffect(() => {
    api.projects.get(project.projectId).then(data => {
      if (data.metadata) {
        setMetadata(data.metadata);
        if (data.metadata.video_url) setVideoUrl(data.metadata.video_url);
        if (data.metadata.youtube_url) setYoutubeUrl(data.metadata.youtube_url);
      }
    }).catch(() => {}).finally(() => setIsLoading(false));

    api.youtube.status()
      .then(r => setYtConnected(r.connected))
      .catch(() => {})
      .finally(() => setYtChecked(true));

    api.instagram.status()
      .then(r => setInstaConnected(r.connected))
      .catch(() => {});

    // Carregar configurações da pasta para automação
    if (project.folderId) {
      api.folders.list().then(folders => {
        const folder = folders.find(f => f.id === project.folderId);
        if (folder) {
          setFolderConfig({
            yt: folder.auto_publish_youtube,
            insta: folder.auto_publish_instagram
          });
        }
      }).catch(() => {});
    }
  }, [project.projectId, project.folderId]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'youtube_connected') {
        api.youtube.status().then(r => setYtConnected(r.connected));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConnectYouTube = async () => {
    try {
      const { url } = await api.youtube.getAuthUrl();
      window.open(url, 'youtube_oauth', 'width=500,height=650,left=400,top=100');
    } catch {
      setYtError('Erro na conexão');
    }
  };

  const handlePublishYouTube = async () => {
    setIsPublishing(true);
    setYtError(null);
    try {
      const { youtube_url } = await api.youtube.upload(
        project.projectId,
        scheduleEnabled ? new Date(scheduledAt).toISOString() : undefined,
      );
      setYoutubeUrl(youtube_url);
      setShowSuccessModal(true);
    } catch (err: any) {
      setYtError(err.message || 'Erro na publicação');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishInstagram = async () => {
    setIsPublishingInsta(true);
    setInstaError(null);
    try {
      const { instagram_url } = await api.instagram.upload(
        project.projectId,
        metadata?.video_title
      );
      setInstagramUrl(instagram_url);
      setInstaSuccess(true);
      if (!isPublishingAll) setShowSuccessModal(true);
    } catch (err: any) {
      setInstaError(err.message || 'Erro ao publicar no Instagram');
    } finally {
      setIsPublishingInsta(false);
    }
  };

  const handlePublishAll = async () => {
    setIsPublishingAll(true);
    const tasks = [];
    if (folderConfig?.yt && ytConnected && !youtubeUrl) tasks.push(handlePublishYouTube());
    if (folderConfig?.insta && instaConnected && !instagramUrl) tasks.push(handlePublishInstagram());
    
    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
    
    setIsPublishingAll(false);
    setShowSuccessModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-8 sm:space-y-12"
    >
      <FolderContextBanner project={project} />

      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          <CheckCircle2 className="w-3 h-3" /> Projeto Concluído
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-bold leading-tight">O seu Short está pronto para o mundo.</h2>
        <p className="text-gray-500 text-base sm:text-lg">Revise os detalhes finais e escolha como quer distribuir seu conteúdo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-2 bg-[#141415] border-white/5 shadow-2xl">
            <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-black relative">
              {videoUrl ? (
                <video src={videoUrl} className="w-full h-full object-cover" controls loop />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-800 gap-4">
                  <Video className="w-12 h-12" />
                  <p className="text-xs font-bold uppercase tracking-widest">Vídeo em processamento</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <a 
              href={videoUrl ?? '#'} 
              download 
              className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${videoUrl ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-700 pointer-events-none'}`}
            >
              <Download className="w-5 h-5" />
              <span>Baixar Vídeo (MP4)</span>
            </a>
            
            <button 
              onClick={onFinish}
              className="w-full py-4 rounded-2xl border border-white/5 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {/* Botão Multicanal (Exibido apenas se configurado na pasta) */}
          {(folderConfig?.yt || folderConfig?.insta) && !youtubeUrl && !instagramUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden glass-card p-8 bg-gradient-to-br from-ai-primary/10 via-purple-500/5 to-transparent border-ai-primary/20 shadow-2xl shadow-ai-primary/5"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Rocket className="w-24 h-24 text-ai-primary" />
              </div>

              <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-ai-primary/10 flex items-center justify-center text-ai-primary shadow-xl shadow-ai-primary/10">
                    <Rocket className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Lançamento Multicanal</h3>
                    <p className="text-sm text-gray-500">Publicar automaticamente nas redes configuradas nesta pasta.</p>
                    <div className="flex items-center gap-3 mt-3">
                      {folderConfig.yt && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase">
                          <Youtube className="w-3 h-3" /> YouTube
                        </div>
                      )}
                      {folderConfig.insta && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500 text-[10px] font-bold uppercase">
                          <Share2 className="w-3 h-3" /> Instagram
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePublishAll}
                  disabled={isPublishingAll || (folderConfig.yt && !ytConnected) || (folderConfig.insta && !instaConnected)}
                  className="w-full md:w-auto px-10 py-5 bg-ai-primary hover:bg-ai-secondary text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-ai-primary/20 disabled:opacity-50 group"
                >
                  {isPublishingAll ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>Lançar Tudo Agora</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Individual Platforms */}
          {!ytConnected ? (
             <section className="glass-card p-8 border-red-500/10 bg-gradient-to-br from-red-500/[0.02] to-transparent">
              <button 
                onClick={handleConnectYouTube}
                className="w-full py-12 border-2 border-dashed border-white/5 hover:border-red-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all group bg-white/[0.01]"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-red-500/5">
                  <Youtube className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white uppercase tracking-widest mb-1">Conectar YouTube</p>
                  <p className="text-[10px] text-gray-500 font-medium">Sincronize sua conta para postar Shorts em um clique.</p>
                </div>
              </button>
             </section>
          ) : youtubeUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">YouTube Publicado!</h4>
                  <p className="text-sm text-gray-500">Seu vídeo já está disponível no Shorts.</p>
                </div>
              </div>
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="btn-primary py-4 px-8 rounded-2xl text-sm whitespace-nowrap">
                <span>Ver no YouTube</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            </motion.div>
          ) : (
            <div className="group relative overflow-hidden glass-card border-white/5 bg-white/[0.02] p-10 hover:border-red-500/20 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full -mr-32 -mt-32 group-hover:bg-red-500/10 transition-all" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-10">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/10 group-hover:scale-110 transition-transform duration-500 shrink-0">
                  <Youtube className="w-10 h-10" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h4 className="text-2xl font-bold text-white tracking-tight">YouTube Shorts</h4>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    Publicação direta com otimização automática de metadados para máxima retenção.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                  <button 
                    onClick={() => setScheduleEnabled(!scheduleEnabled)}
                    className={`h-14 px-8 rounded-2xl border transition-all flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${scheduleEnabled ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/10'}`}
                  >
                    {scheduleEnabled ? 'Agendado' : 'Agendar'}
                  </button>

                  {scheduleEnabled && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative w-full sm:w-auto">
                      <input 
                        type="datetime-local" 
                        className="h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-xs text-white outline-none focus:border-red-500/50 transition-all w-full sm:w-auto font-mono"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Sincronização YouTube</span>
                </div>
                
                <button 
                  onClick={handlePublishYouTube}
                  disabled={isPublishing}
                  className="w-full sm:w-auto btn-primary py-5 px-12 rounded-[1.5rem] bg-red-600 hover:bg-red-500 border-red-500/50 shadow-2xl shadow-red-600/30 text-base"
                >
                  {isPublishing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                  <span>{scheduleEnabled ? 'Agendar no YouTube' : 'Publicar no YouTube'}</span>
                </button>
              </div>
              {ytError && <p className="text-xs text-center text-red-500 font-medium mt-4">{ytError}</p>}
            </div>
          )}

          {/* Instagram Section */}
          {instagramUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 rounded-[2rem] bg-pink-500/5 border border-pink-500/10 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 shadow-xl shadow-pink-500/5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">Reels Publicado!</h4>
                  <p className="text-sm text-gray-500">Seu vídeo já está disponível no seu feed do Instagram.</p>
                </div>
              </div>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="btn-primary py-4 px-8 rounded-2xl text-sm whitespace-nowrap bg-gradient-to-r from-orange-500 to-pink-500 border-none">
                <span>Ver no Instagram</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            </motion.div>
          ) : (
            <div className="group relative overflow-hidden glass-card border-white/5 bg-white/[0.02] p-10 hover:border-pink-500/20 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[80px] rounded-full -mr-32 -mt-32 group-hover:bg-pink-500/10 transition-all" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-500/10 flex items-center justify-center text-white shadow-2xl shadow-pink-500/10 group-hover:scale-110 transition-transform duration-500 shrink-0">
                  <Share2 className="w-10 h-10" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h4 className="text-2xl font-bold text-white tracking-tight">Instagram Reels</h4>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    Postagem automática de Reels para impulsionar seu alcance no ecossistema Meta.
                  </p>
                </div>

                <div className="shrink-0">
                  {!instaConnected ? (
                    <button 
                      onClick={() => window.open('https://developers.facebook.com/apps/1310746801013095/fb-login/', '_blank')}
                      className="h-14 px-8 rounded-2xl border border-white/5 bg-white/5 text-gray-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Configurar App
                    </button>
                  ) : (
                    <button 
                      onClick={handlePublishInstagram}
                      disabled={isPublishingInsta}
                      className="w-full sm:w-auto btn-primary py-5 px-12 rounded-[1.5rem] bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 border-none shadow-2xl shadow-pink-600/30 text-base"
                    >
                      {isPublishingInsta ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                      <span>{isPublishingInsta ? 'Processando Reels...' : 'Publicar no Reels'}</span>
                    </button>
                  )}
                </div>
              </div>
              {instaError && <p className="text-xs text-center text-red-500 font-medium mt-4">{instaError}</p>}
              {isPublishingInsta && (
                <p className="text-[10px] text-center text-gray-500 mt-4 animate-pulse">
                  Aguardando o Instagram processar o vídeo (isso pode levar até 1 minuto)...
                </p>
              )}
            </div>
          )}

          <section className="glass-card p-8">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Otimização do Algoritmo
            </h4>
            
            <div className="space-y-8">
              <div className="group relative">
                <p className="text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-3">Título Sugerido</p>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-all flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-200">{metadata?.video_title || 'Gerando título...'}</p>
                  <button onClick={() => copyToClipboard(metadata?.video_title || '')} className="p-2 text-gray-600 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="group relative">
                <p className="text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-3">Descrição Estruturada</p>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-all">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => copyToClipboard(metadata?.description || '')} className="p-2 text-gray-600 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">
                    {metadata?.description || 'Gerando descrição...'}
                  </p>
                </div>
              </div>

              <div className="group relative">
                <p className="text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-3">Principais Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {metadata?.hashtags.map(tag => (
                    <span key={tag} className="px-4 py-2 rounded-xl bg-ai-primary/5 border border-ai-primary/10 text-ai-primary text-xs font-bold">
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setShowSuccessModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative glass-card p-12 max-w-lg text-center space-y-8"
            >
              <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-display font-bold">Missão Cumprida!</h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  {youtubeUrl && instagramUrl 
                    ? 'Seu conteúdo foi lançado com sucesso no YouTube Shorts e Instagram Reels.'
                    : youtubeUrl 
                      ? 'Seu vídeo foi enviado para o YouTube e já está sendo processado.'
                      : 'Seu Reel foi publicado com sucesso no Instagram.'}
                </p>
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <a href={youtubeUrl!} target="_blank" rel="noreferrer" className="btn-primary py-4 rounded-2xl w-full">
                  <span>Ver Status no YouTube</span>
                </a>
                <button onClick={() => setShowSuccessModal(false)} className="py-4 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-all">
                  Fechar Resumo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
