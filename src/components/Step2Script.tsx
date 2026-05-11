import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Edit2, RotateCw, ArrowRight, ArrowLeft, Clock, MessageSquare, PlayCircle, Star, AlertCircle, Zap } from 'lucide-react';
import { api, type ApiScript, type ApiScene, type ApiMetadata } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface Step2ScriptProps {
  project: ProjectContext;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Script({ project, onNext, onBack }: Step2ScriptProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<ApiScript | null>(null);
  const [scenes, setScenes] = useState<ApiScene[]>([]);
  const [metadata, setMetadata] = useState<ApiMetadata | null>(null);
  const generatedRef = useRef(false);
  const usedHooksRef = useRef<string[]>([]);

  useEffect(() => {
    if (generatedRef.current) return;
    generatedRef.current = true;

    api.scripts
      .generate(project.projectId, {
        topic: project.topic,
        niche: project.niche,
        language: project.defaultLanguage,
      })
      .then(result => {
        setScript(result.script);
        setScenes(result.scenes);
        setMetadata(result.metadata);
        setIsGenerating(false);
        if (result.script.hook) usedHooksRef.current.push(result.script.hook);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao gerar roteiro');
        setIsGenerating(false);
      });
  }, [project]);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setError(null);
    generatedRef.current = false;

    try {
      const result = await api.scripts.generate(project.projectId, {
        topic: project.topic,
        niche: project.niche,
        previous_hook: usedHooksRef.current.join(' | '),
        previous_title: script?.title,
        language: project.defaultLanguage,
      });
      setScript(result.script);
      setScenes(result.scenes);
      setMetadata(result.metadata);
      if (result.script.hook) usedHooksRef.current.push(result.script.hook);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao regerar roteiro');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-10rem)]"
    >
      <div className="mb-6">
        <FolderContextBanner project={project} />
      </div>

      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-display font-bold">Roteiro Sugerido</h2>
        </div>
        {!isGenerating && !error && (
          <button
            onClick={onNext}
            className="btn-primary py-3 px-8 rounded-2xl shadow-xl shadow-ai-primary/20"
          >
            <span>Aprovar Roteiro</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <div className="w-20 h-20 relative">
                <div className="absolute inset-0 bg-ai-primary/20 blur-2xl animate-pulse rounded-full" />
                <div className="w-full h-full border-2 border-ai-primary/10 border-t-ai-primary rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-ai-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Escrevendo o roteiro...</h3>
                <p className="text-gray-500">Nossa IA está aplicando técnicas de retenção viral.</p>
              </div>
            </motion.div>
          ) : error ? (
            <div className="glass-card p-12 text-center max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <p className="text-gray-300 mb-6">{error}</p>
              <button onClick={handleRegenerate} className="text-ai-primary font-bold hover:underline uppercase text-xs tracking-widest">Tentar Novamente</button>
            </div>
          ) : script ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-12 gap-8 items-start"
            >
              {/* Editor Principal */}
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card p-10 min-h-[500px] border-white/5 bg-[#141415]/50">
                  <div className="mb-10 group">
                    <p className="text-[10px] font-bold text-ai-primary uppercase tracking-[0.2em] mb-4">Título do Projeto</p>
                    <h3 
                      className="text-4xl font-display font-bold text-white outline-none selection:bg-ai-primary/30" 
                      contentEditable 
                      suppressContentEditableWarning
                    >
                      {script.title}
                    </h3>
                  </div>

                  <div className="space-y-12">
                    <div className="p-8 rounded-3xl bg-ai-primary/5 border border-ai-primary/10 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-ai-primary/40" />
                      <div className="flex items-center gap-2 text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-4">
                        <Zap className="w-3 h-3" /> Gancho de Retenção
                      </div>
                      <p className="text-xl text-gray-200 font-medium leading-relaxed italic selection:bg-ai-primary/30">
                        "{script.hook}"
                      </p>
                    </div>

                    <div className="group">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Conteúdo do Vídeo</p>
                      <div
                        className="text-lg text-gray-300 leading-loose outline-none whitespace-pre-wrap selection:bg-ai-primary/30 min-h-[200px]"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {script.body}
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-ai-secondary/5 border border-ai-secondary/10 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-ai-secondary/40" />
                      <div className="flex items-center gap-2 text-[10px] font-bold text-ai-secondary uppercase tracking-widest mb-4">
                        <MessageSquare className="w-3 h-3" /> Call to Action
                      </div>
                      <p className="text-lg text-gray-200 font-medium">"{script.cta}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar de Info */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-card p-6 space-y-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Estimativas
                    </h4>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-sm text-gray-400">Duração do vídeo</p>
                          <p className="text-2xl font-display font-bold">{script.duration_seconds}s</p>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-ai-primary" style={{ width: `${Math.min((script.duration_seconds / 60) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Configuração Sugerida</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <InfoItem label="Tom de Voz" value={script.voice_tone} />
                      <InfoItem label="Velocidade" value={script.narration_speed} />
                    </div>
                  </div>

                  {metadata && (
                    <div className="pt-8 border-t border-white/5">
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Otimização SEO</h4>
                      <div className="flex flex-wrap gap-2">
                        {metadata.hashtags.map(tag => (
                          <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500">
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRegenerate}
                  className="w-full py-4 glass-card border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-center gap-3 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest"
                >
                  <RotateCw className="w-4 h-4" />
                  Regerar Roteiro
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-gray-600 uppercase font-bold">{label}</p>
      <p className="text-sm text-gray-300 font-medium">{value}</p>
    </div>
  );
}
