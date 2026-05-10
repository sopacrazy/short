import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Youtube, Share2, Copy, Rocket, Hash, AlignLeft, Loader2, Video, ExternalLink } from 'lucide-react';
import { api, type ApiMetadata, type ApiScene } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';

interface Step5ExportProps {
  project: ProjectContext;
  onFinish: () => void;
  onBack: () => void;
}

export default function Step5Export({ project, onFinish, onBack }: Step5ExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [metadata, setMetadata] = useState<ApiMetadata | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);

  // YouTube
  const [ytConnected, setYtConnected] = useState(false);
  const [ytChecked, setYtChecked] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    api.projects.get(project.projectId).then(data => {
      if (data.metadata) {
        setMetadata(data.metadata);
        if (data.metadata.video_url) setVideoUrl(data.metadata.video_url);
        if (data.metadata.youtube_url) setYoutubeUrl(data.metadata.youtube_url);
        if (data.metadata.thumbnail_url) {
          setThumbnail(data.metadata.thumbnail_url);
          return;
        }
      }
      // fallback: primeira cena com imagem
      const firstWithImage = data.scenes.find((s: ApiScene) => s.image_url);
      if (firstWithImage?.image_url) setThumbnail(firstWithImage.image_url);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [project.projectId]);

  useEffect(() => {
    api.youtube.status()
      .then(r => setYtConnected(r.connected))
      .catch(() => {})
      .finally(() => setYtChecked(true));
  }, []);

  // Escuta mensagem do popup OAuth e re-verifica o status real
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'youtube_connected') {
        api.youtube.status()
          .then(r => {
            if (r.connected) {
              setYtConnected(true);
            } else {
              setYtError('Autenticação recebida, mas tokens não foram salvos. Execute a migration SQL no Supabase (tabela youtube_tokens) e tente novamente.');
            }
          })
          .catch(() => setYtError('Não foi possível verificar a conexão. Tente novamente.'));
      } else if (e.data === 'youtube_error') {
        setYtError('Falha na autenticação com o Google. Tente novamente.');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConnectYouTube = async () => {
    setYtError(null);
    try {
      const { url } = await api.youtube.getAuthUrl();
      const popup = window.open(url, 'youtube_oauth', 'width=500,height=650,left=400,top=100');
      popupRef.current = popup;
    } catch {
      setYtError('Erro ao iniciar autenticação. Verifique as configurações do Google no servidor.');
    }
  };

  const handlePublishYouTube = async () => {
    if (scheduleEnabled && !scheduledAt) {
      setYtError('Selecione uma data e hora para agendar.');
      return;
    }
    setIsPublishing(true);
    setYtError(null);
    try {
      const { youtube_url } = await api.youtube.upload(
        project.projectId,
        scheduleEnabled ? new Date(scheduledAt).toISOString() : undefined,
      );
      setYoutubeUrl(youtube_url);
    } catch (err) {
      setYtError(err instanceof Error ? err.message : 'Erro ao publicar no YouTube');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerateThumbnail = async () => {
    setIsGeneratingThumb(true);
    setThumbError(null);
    try {
      const result = await api.projects.generateThumbnail(project.projectId);
      setThumbnail(result.thumbnail_url);
    } catch (err) {
      setThumbError(err instanceof Error ? err.message : 'Erro ao gerar thumbnail');
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const handleExport = () => {
    setIsExporting(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog += 2;
      setExportProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => { setIsExporting(false); setExportProgress(0); }, 1000);
      }
    }, 50);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto flex flex-col"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold mb-6">
          <CheckCircle2 className="w-5 h-5" />
          <span>Projeto Finalizado com Sucesso</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-semibold mb-4 text-balance">
          Seu próximo conteúdo viral está pronto.
        </h2>
        <p className="text-gray-400 text-lg">Revise os metadados antes de publicar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        {/* Vídeo + Thumbnail + Export */}
        <div className="space-y-4">

          {/* Vídeo */}
          {videoUrl && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> Vídeo Final
              </p>
              <div className="bg-[#141415] rounded-2xl border border-[#ffffff1a] p-1.5 overflow-hidden">
                <video
                  src={videoUrl}
                  className="w-full aspect-[9/16] object-cover rounded-xl"
                  controls
                  loop
                  playsInline
                  muted
                />
              </div>
            </div>
          )}


          {!isExporting ? (
            <div className="space-y-3">
              {videoUrl ? (
                <a
                  href={videoUrl}
                  download={`${project.topic.substring(0, 30).trim().replace(/\s+/g, '_')}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-5 h-5" /> Baixar Vídeo MP4
                </a>
              ) : (
                <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors">
                  <Video className="w-5 h-5" /> Exportar Vídeo
                </button>
              )}
              {/* YouTube */}
              {ytChecked && (
                <div className="space-y-2">
                  {youtubeUrl ? (
                    <div className="space-y-2">
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium text-sm"
                      >
                        <Youtube className="w-5 h-5" />
                        Ver no YouTube
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                      <button
                        onClick={() => { setYoutubeUrl(null); setYtError(null); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors text-xs font-medium"
                      >
                        Publicar novamente
                      </button>
                    </div>
                  ) : !ytConnected ? (
                    <button
                      onClick={handleConnectYouTube}
                      disabled={!videoUrl}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Youtube className="w-5 h-5" /> Conectar YouTube
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Toggle agendar */}
                      <button
                        onClick={() => { setScheduleEnabled(v => !v); setYtError(null); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                          scheduleEnabled
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>📅 Agendar publicação</span>
                        <span className={`w-8 h-4 rounded-full transition-colors relative ${scheduleEnabled ? 'bg-orange-500' : 'bg-white/20'}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </span>
                      </button>

                      {scheduleEnabled && (
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={e => setScheduledAt(e.target.value)}
                          min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                          className="w-full bg-[#0A0A0B] border border-orange-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/60 [color-scheme:dark]"
                        />
                      )}

                      <button
                        onClick={handlePublishYouTube}
                        disabled={isPublishing || !videoUrl}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPublishing ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> {scheduleEnabled ? 'Agendando...' : 'Enviando para YouTube...'}</>
                        ) : scheduleEnabled ? (
                          <><Youtube className="w-5 h-5" /> Agendar Short</>
                        ) : (
                          <><Youtube className="w-5 h-5" /> Publicar como Short</>
                        )}
                      </button>
                    </div>
                  )}
                  {ytError && (
                    <p className="text-xs text-red-400 text-center">{ytError}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#141415] border border-[#ffffff1a]">
              <p className="text-sm font-semibold mb-4 flex items-center justify-between">
                <span>Exportando...</span>
                <span className="text-[#00E5FF]">{exportProgress}%</span>
              </p>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#7B61FF]" style={{ width: `${exportProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Metadados */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-3xl p-6 md:p-8 backdrop-blur-xl h-full flex flex-col">
            <h3 className="text-xl font-display font-semibold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
              <AlignLeft className="w-5 h-5 text-[#7B61FF]" /> Metadados Otimizados
            </h3>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#7B61FF]" />
              </div>
            ) : (
              <div className="space-y-6 flex-1">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título Otimizado</p>
                    {metadata?.video_title && (
                      <button onClick={() => copyToClipboard(metadata.video_title)} className="text-gray-500 hover:text-white transition-colors" title="Copiar">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-[#1A1A1E] border border-white/5 font-medium text-white shadow-inner">
                    {metadata?.video_title ?? 'Aguardando geração...'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição SEO</p>
                    {metadata?.description && (
                      <button onClick={() => copyToClipboard(metadata.description)} className="text-gray-500 hover:text-white transition-colors" title="Copiar">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-[#1A1A1E] border border-white/5 text-gray-300 text-sm leading-relaxed shadow-inner font-mono max-h-40 overflow-y-auto custom-scrollbar">
                    {metadata?.description ?? 'Aguardando geração...'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-4 h-4" /> Hashtags
                    </p>
                    {metadata?.hashtags && (
                      <button onClick={() => copyToClipboard(metadata.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' '))} className="text-gray-500 hover:text-white transition-colors" title="Copiar">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(metadata?.hashtags ?? []).map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-[#7B61FF]/10 text-[#7B61FF] text-sm border border-[#7B61FF]/20 font-medium">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
              <button onClick={onBack} className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">Voltar para Edição</button>
              <button onClick={onFinish} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1A1E] border border-white/10 text-white font-medium hover:bg-white/10 transition-colors">
                <Rocket className="w-5 h-5" /> Retornar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
