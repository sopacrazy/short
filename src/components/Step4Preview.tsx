import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wand2, Loader2, CheckCircle, AlertCircle, Film, Type, Zap, Music, ArrowRight } from 'lucide-react';
import { api } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface Step4PreviewProps {
  project: ProjectContext;
  onNext: () => void;
  onBack: () => void;
}

type RenderStatus = 'idle' | 'queued' | 'started' | 'rendering' | 'completed' | 'error';

export default function Step4Preview({ project, onNext, onBack }: Step4PreviewProps) {
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle');
  const [renderMessage, setRenderMessage] = useState('');
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    api.projects.get(project.projectId).then(data => {
      if (data.project.status === 'completed' && data.metadata?.video_url) {
        setVideoUrl(data.metadata.video_url ?? null);
        setRenderStatus('completed');
      }
    }).catch(() => {});
  }, [project.projectId]);

  const handleRender = async () => {
    setError(null);
    setRenderStatus('queued');
    setRenderMessage('Entrando na fila de processamento...');

    try {
      const result = await api.render.start(project.projectId);
      if (result.videoUrl) {
        setVideoUrl(result.videoUrl);
        setRenderStatus('completed');
        return;
      }
    } catch (err) {
      setError('Falha ao iniciar motor de renderização');
      setRenderStatus('error');
      return;
    }

    const es = api.render.streamStatus(project.projectId);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'progress') {
          setRenderStatus('rendering');
          setRenderProgress(data.progress ?? 0);
          setRenderMessage(`Processando frames...`);
        } else if (data.type === 'completed') {
          setRenderStatus('completed');
          setVideoUrl(data.videoUrl ?? null);
          setVideoLoading(true);
          es.close();
          api.projects.generateThumbnail(project.projectId).catch(() => {});
        } else if (data.type === 'error') {
          setRenderStatus('error');
          setError(data.message);
          es.close();
        }
      } catch {}
    };
  };

  const isRendering = ['queued', 'started', 'rendering'].includes(renderStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto px-4 py-6 sm:py-8"
    >
      <div className="mb-8">
        <FolderContextBanner project={project} />
      </div>

      <div className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-display font-bold">Preview e Renderização</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
        {/* Celular Cinematic */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-[320px] aspect-[9/19] rounded-[3rem] bg-black border-[12px] border-[#1A1A1E] shadow-[0_0_80px_rgba(123,97,255,0.15)] overflow-hidden group">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1A1A1E] rounded-b-2xl z-[60]" />
            
            {videoUrl && renderStatus === 'completed' ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                controls
                loop
                onCanPlay={() => setVideoLoading(false)}
              />
            ) : isRendering ? (
              <div className="absolute inset-0 bg-[#0A0A0B] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 relative mb-8">
                  <div className="absolute inset-0 border-2 border-ai-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-t-ai-primary rounded-full animate-spin" />
                  <Film className="absolute inset-0 m-auto w-8 h-8 text-ai-primary animate-pulse" />
                </div>
                <p className="text-xs font-bold text-ai-primary uppercase tracking-[0.3em] mb-2">Renderizando</p>
                <p className="text-2xl font-display font-bold text-white">{renderProgress}%</p>
              </div>
            ) : (
              <div className="absolute inset-0 bg-[#0A0A0B] flex flex-col items-center justify-center p-12 text-center">
                <Wand2 className="w-12 h-12 text-gray-800 mb-6" />
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                  Aguardando comando de renderização
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info e Controles */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <h3 className="text-2xl sm:text-4xl font-display font-bold leading-tight">
              {renderStatus === 'completed' ? 'Seu Short está pronto!' : 'Quase lá, vamos dar vida ao seu projeto.'}
            </h3>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-lg">
              {renderStatus === 'completed' 
                ? 'O vídeo foi processado com sucesso. Verifique o preview e prossiga para a exportação.' 
                : 'Clique no botão abaixo para iniciar a montagem final. Nossa IA aplicará legendas, zooms e trilha sonora.'}
            </p>
          </div>

          {!isRendering && renderStatus !== 'completed' && (
            <div className="grid grid-cols-2 gap-4">
              <FeatureItem icon={<Type className="w-4 h-4" />} text="Legendas Dinâmicas" />
              <FeatureItem icon={<Zap className="w-4 h-4" />} text="Efeitos de Zoom" />
              <FeatureItem icon={<Music className="w-4 h-4" />} text="Mixagem de Áudio" />
              <FeatureItem icon={<CheckCircle className="w-4 h-4" />} text="Qualidade HD" />
            </div>
          )}

          {isRendering && (
            <div className="glass-card p-8 border-ai-primary/20 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-1">Status do Processamento</p>
                  <p className="text-sm text-gray-300 font-medium">{renderMessage}</p>
                </div>
                <p className="text-3xl font-display font-bold text-white">{renderProgress}%</p>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-ai-primary to-ai-secondary" 
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                <Loader2 className="w-3 h-3 animate-spin" /> Por favor, não feche esta aba durante o processo.
              </div>
            </div>
          )}

          <div className="pt-8">
            {renderStatus === 'completed' ? (
              <button
                onClick={onNext}
                className="btn-primary py-5 px-12 rounded-2xl shadow-2xl shadow-ai-primary/30"
              >
                <span>Próximo: Exportar Vídeo</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={handleRender}
                disabled={isRendering}
                className={`
                  flex items-center gap-4 py-5 px-12 rounded-2xl font-bold text-lg transition-all
                  ${isRendering 
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-gray-200 shadow-2xl shadow-white/10'}
                `}
              >
                {isRendering ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
                <span>{isRendering ? 'Renderizando...' : 'Iniciar Renderização'}</span>
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-ai-primary">
        {icon}
      </div>
      {text}
    </div>
  );
}
