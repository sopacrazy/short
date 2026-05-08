import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Edit2, RotateCw, ArrowRight, ArrowLeft, Clock, MessageSquare, PlayCircle, Star, AlertCircle } from 'lucide-react';
import { api, type ApiScript, type ApiScene, type ApiMetadata } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';

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
  // Acumula todos os ganchos gerados para evitar repetição em regenerações
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

  const durationPercent = script ? Math.min((script.duration_seconds / 60) * 100, 100) : 70;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="text-[#00E5FF]">Etapa 2 de 5</span>
          </div>
          <h2 className="text-3xl font-display font-semibold text-balance">Roteiro Gerado</h2>
        </div>
        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center max-w-sm"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-[#00E5FF] blur-2xl opacity-20 rounded-full animate-pulse" />
                <Sparkles className="w-16 h-16 text-[#00E5FF] animate-bounce" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">Escrevendo o roteiro perfeito...</h3>
              <p className="text-gray-400 text-sm">Aplicando princípios de neurociência e ganchos de retenção.</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center max-w-sm gap-4"
            >
              <AlertCircle className="w-12 h-12 text-rose-400" />
              <p className="text-rose-400 text-sm">{error}</p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                <RotateCw className="w-4 h-4" /> Tentar novamente
              </button>
            </motion.div>
          ) : script ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full h-full flex flex-col"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Editar manual">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mb-6">
                      <p className="text-xs font-semibold text-[#7B61FF] uppercase tracking-wider mb-2">Título do Vídeo</p>
                      <h3 className="text-2xl font-display font-semibold text-white outline-none" contentEditable suppressContentEditableWarning>
                        {script.title}
                      </h3>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-transparent border-l-4 border-rose-500">
                        <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Star className="w-3 h-3" /> Gancho Viral (0-3s)
                        </p>
                        <p className="text-lg text-white font-medium">"{script.hook}"</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Corpo do Roteiro</p>
                        <p
                          className="text-gray-300 leading-relaxed text-[15px] outline-none whitespace-pre-wrap"
                          contentEditable
                          suppressContentEditableWarning
                        >
                          {script.body}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-gradient-to-r from-[#00E5FF]/10 to-transparent border-l-4 border-[#00E5FF]">
                        <p className="text-xs font-semibold text-[#00E5FF] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Call to Action
                        </p>
                        <p className="text-gray-200">"{script.cta}"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-2xl p-5 backdrop-blur-xl">
                    <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-[#7B61FF]" /> Detalhes
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Duração Estimada</p>
                        <p className="text-2xl font-display font-semibold">{script.duration_seconds} Segundos</p>
                        <div className="w-full bg-[#1A1A1E] h-2 rounded-full mt-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-[#7B61FF] to-[#00E5FF] h-full" style={{ width: `${durationPercent}%` }} />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-[#ffffff0a]">
                        <p className="text-xs text-gray-500 uppercase mb-1">Tom de Voz</p>
                        <p className="text-sm font-medium">{script.voice_tone}</p>
                      </div>
                      <div className="pt-4 border-t border-[#ffffff0a]">
                        <p className="text-xs text-gray-500 uppercase mb-1">Velocidade da Narração</p>
                        <p className="text-sm font-medium">{script.narration_speed}</p>
                      </div>
                      {metadata && (
                        <div className="pt-4 border-t border-[#ffffff0a]">
                          <p className="text-xs text-gray-500 uppercase mb-2">Hashtags</p>
                          <div className="flex flex-wrap gap-1">
                            {metadata.hashtags.slice(0, 5).map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#7B61FF]/20 text-[#7B61FF]">
                                #{tag.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleRegenerate}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-gray-300"
                  >
                    <RotateCw className="w-4 h-4" />
                    Gerar Nova Versão
                  </button>

                  {scenes.length > 0 && (
                    <div className="bg-[#141415]/80 border border-[#ffffff1a] rounded-2xl p-4 backdrop-blur-xl">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{scenes.length} Cenas geradas</p>
                      <div className="space-y-2">
                        {scenes.map(s => (
                          <div key={s.id} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-[#7B61FF] font-mono shrink-0">C{s.scene_number}</span>
                            <span className="line-clamp-1">{s.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center bg-[#141415]/50 p-4 rounded-2xl border border-[#ffffff0a]">
                <p className="text-sm text-gray-400">Tudo certo com o roteiro?</p>
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>Aprovar e Gerar Imagens</span>
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
