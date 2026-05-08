import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Youtube, Share2, Copy, Rocket, Hash, AlignLeft, Image, Loader2, Video, Sparkles, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    api.projects.get(project.projectId).then(data => {
      if (data.metadata) {
        setMetadata(data.metadata);
        if (data.metadata.video_url) setVideoUrl(data.metadata.video_url);
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

          {/* Thumbnail */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" /> Capa / Thumbnail
            </p>
            <div className="bg-[#141415] rounded-2xl border border-[#ffffff1a] p-1.5 overflow-hidden relative group">
              {isGeneratingThumb ? (
                <div className="w-full aspect-[9/16] rounded-xl bg-[#1A1A1E] flex flex-col items-center justify-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-3 border-[#7B61FF]/20" />
                    <div className="absolute inset-0 rounded-full border-3 border-t-[#7B61FF] border-r-[#00E5FF] border-b-transparent border-l-transparent animate-spin" />
                  </div>
                  <p className="text-xs text-gray-500">Gerando thumbnail...</p>
                </div>
              ) : thumbnail ? (
                <img
                  src={thumbnail}
                  alt="Thumbnail"
                  className="w-full aspect-[9/16] object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-full aspect-[9/16] rounded-xl bg-[#1A1A1E] flex flex-col items-center justify-center gap-2 text-gray-600">
                  <Image className="w-10 h-10 opacity-20" />
                  <p className="text-xs text-gray-600">Nenhuma thumbnail gerada</p>
                </div>
              )}
            </div>

            {/* Botão gerar / regerar thumbnail */}
            <button
              onClick={handleGenerateThumbnail}
              disabled={isGeneratingThumb}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7B61FF]/15 border border-[#7B61FF]/30 hover:bg-[#7B61FF]/25 hover:border-[#7B61FF]/50 text-[#7B61FF] font-semibold text-sm transition-all disabled:opacity-50"
            >
              {isGeneratingThumb
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : thumbnail
                ? <><RefreshCw className="w-4 h-4" /> Regerar Thumbnail</>
                : <><Sparkles className="w-4 h-4" /> Gerar Thumbnail com IA</>
              }
            </button>
            {thumbError && <p className="text-xs text-rose-400 text-center mt-1">{thumbError}</p>}
          </div>

          {!isExporting ? (
            <div className="space-y-3">
              {videoUrl ? (
                <a
                  href={videoUrl}
                  download={`short-${project.projectId}.mp4`}
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
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium text-sm">
                  <Youtube className="w-5 h-5" /> YouTube Short
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/20 hover:bg-[#00f2fe]/20 transition-colors font-medium text-sm">
                  <Share2 className="w-5 h-5" /> TikTok
                </button>
              </div>
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
