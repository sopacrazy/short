import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Loader2, AlertCircle, Sparkles, FileText, ImageIcon, Mic, Film, ArrowLeft, GalleryThumbnails } from 'lucide-react';
import { api } from '@/src/lib/api';
import type { ProjectContext } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface AutoGenerationProps {
  project: ProjectContext;
  onComplete: (projectId: string) => void;
  onBack: () => void;
}

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const STEPS: PipelineStep[] = [
  { id: 'script',    label: 'Roteiro',      sublabel: 'Gerando narrativa e cenas...',      icon: <FileText className="w-5 h-5" /> },
  { id: 'images',    label: 'Imagens',      sublabel: 'Criando visuais com IA...',          icon: <ImageIcon className="w-5 h-5" /> },
  { id: 'narration', label: 'Narração',     sublabel: 'Sintetizando voz com ElevenLabs...', icon: <Mic className="w-5 h-5" /> },
  { id: 'render',    label: 'Renderização', sublabel: 'Montando o vídeo final...',          icon: <Film className="w-5 h-5" /> },
  { id: 'thumbnail', label: 'Thumbnail',    sublabel: 'Gerando capa personalizada...',      icon: <GalleryThumbnails className="w-5 h-5" /> },
];

export default function AutoGeneration({ project, onComplete, onBack }: AutoGenerationProps) {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({
    script: 'pending', images: 'pending', narration: 'pending', render: 'pending', thumbnail: 'pending',
  });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const ran = useRef(false);

  const setStatus = (id: string, status: StepStatus) =>
    setStatuses(prev => ({ ...prev, [id]: status }));

  const setStepProgress = (id: string, pct: number) =>
    setProgress(prev => ({ ...prev, [id]: pct }));

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    runPipeline();
  }, []);

  const runPipeline = async () => {
    try {
      // ── ETAPA 1: Roteiro ──────────────────────────────────────────
      setStatus('script', 'running');
      await api.scripts.generate(project.projectId, {
        topic: project.topic,
        niche: project.niche,
        language: project.defaultLanguage,
      });
      setStatus('script', 'done');

      // ── ETAPA 2: Imagens (SSE) ────────────────────────────────────
      setStatus('images', 'running');
      let imagesTotal = 0;
      let imagesDone = 0;
      for await (const evt of api.images.generateStream(project.projectId)) {
        if (evt.type === 'started' && evt.total) {
          imagesTotal = evt.total;
        } else if (evt.type === 'scene_done') {
          imagesDone++;
          setStepProgress('images', imagesTotal > 0 ? Math.round((imagesDone / imagesTotal) * 100) : 0);
        } else if (evt.type === 'completed') {
          setStepProgress('images', 100);
        }
      }
      setStatus('images', 'done');

      // ── ETAPA 3: Narração ─────────────────────────────────────────
      setStatus('narration', 'running');
      await api.narration.generate(project.projectId, project.defaultVoiceId);
      setStatus('narration', 'done');

      // ── ETAPA 4: Renderização (SSE via EventSource) ───────────────
      setStatus('render', 'running');

      // Abre o SSE ANTES de enfileirar o render para não perder eventos
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const es = api.render.streamStatus(project.projectId);

        // Só inicia o render após o SSE estar aberto (primeiro evento confirma conexão)
        let renderStarted = false;
        const startRender = () => {
          if (renderStarted) return;
          renderStarted = true;
          api.render.start(project.projectId).catch((err) => {
            if (!settled) {
              settled = true;
              es.close();
              reject(err instanceof Error ? err : new Error('Erro ao iniciar renderização'));
            }
          });
        };

        // Dispara o render assim que o SSE conectar (aguarda no máximo 3s)
        const startTimer = setTimeout(startRender, 200);
        es.addEventListener('open', () => { clearTimeout(startTimer); startRender(); });

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data) as {
              type?: string; status?: string; progress?: number; message?: string;
            };

            if (data.type === 'progress' && data.progress !== undefined) {
              setStepProgress('render', data.progress);
            }

            const isCompleted =
              data.type === 'completed' ||
              (data.type === 'current_status' && data.status === 'completed');
            const isError = data.type === 'error';

            if (isCompleted && !settled) {
              settled = true;
              es.close();
              resolve();
            }
            if (isError && !settled) {
              settled = true;
              es.close();
              reject(new Error(data.message ?? 'Erro na renderização'));
            }
          } catch { /* ignore */ }
        };

        // onerror também dispara quando o servidor fecha a conexão normalmente;
        // só rejeita se ainda não recebemos um evento terminal
        es.onerror = () => {
          if (!settled) {
            settled = true;
            es.close();
            reject(new Error('Conexão com renderizador perdida'));
          }
        };
      });

      setStatus('render', 'done');

      // ── ETAPA 5: Thumbnail ────────────────────────────────────────
      setStatus('thumbnail', 'running');
      await api.projects.generateThumbnail(project.projectId);
      setStatus('thumbnail', 'done');

      setDone(true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      setError(msg);
      // marca o step atual como erro
      setStatuses(prev => {
        const updated = { ...prev };
        const runningKey = Object.keys(updated).find(k => updated[k] === 'running');
        if (runningKey) updated[runningKey] = 'error';
        return updated;
      });
    }
  };

  const activeStep = STEPS.findIndex(s => statuses[s.id] === 'running');
  const messages = [
    'Analisando o tema e estruturando a narrativa...',
    'Criando visuais únicos para cada cena...',
    'Adicionando a voz ao roteiro...',
    'Montando e renderizando o vídeo...',
    'Gerando capa personalizada para o short...',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto flex flex-col items-center justify-center py-8 sm:py-12"
    >
      <div className="w-full">
        <FolderContextBanner project={project} />
      </div>

      {/* Cabeçalho */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider mb-4">
          <span className="text-[#00E5FF]">Modo Automático</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-semibold mb-3">
          {done ? 'Short criado com sucesso!' : 'Criando seu short...'}
        </h2>
        <p className="text-gray-400 text-sm">
          {done
            ? 'Seu vídeo está pronto. Clique abaixo para ver o resultado.'
            : activeStep >= 0 ? messages[activeStep] : 'Iniciando pipeline de geração...'}
        </p>
      </div>

      {/* Orb animado */}
      <AnimatePresence>
        {!done && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative w-32 h-32 mb-12"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7B61FF] to-[#00E5FF] opacity-20 blur-2xl animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-[#7B61FF]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#7B61FF] border-r-[#00E5FF] border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#7B61FF]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps */}
      <div className="w-full space-y-3 mb-10">
        {STEPS.map((step, i) => {
          const status = statuses[step.id];
          const pct = progress[step.id];
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                status === 'running' ? 'bg-gradient-to-r from-[#7B61FF]/15 to-[#00E5FF]/8 border-[#7B61FF]/40' :
                status === 'done'    ? 'bg-[#141415]/40 border-emerald-500/20' :
                status === 'error'   ? 'bg-rose-500/10 border-rose-500/30' :
                                       'bg-[#141415]/30 border-[#ffffff08]'
              }`}
            >
              {/* Ícone de status */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                status === 'running' ? 'bg-gradient-to-br from-[#7B61FF] to-[#00E5FF]' :
                status === 'done'    ? 'bg-emerald-500/20' :
                status === 'error'   ? 'bg-rose-500/20' :
                                       'bg-white/5'
              }`}>
                {status === 'running' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> :
                 status === 'done'    ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                 status === 'error'   ? <AlertCircle className="w-5 h-5 text-rose-400" /> :
                 <span className={status === 'pending' ? 'text-gray-600' : 'text-white'}>{step.icon}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`font-semibold text-sm ${
                    status === 'running' ? 'text-white' :
                    status === 'done'    ? 'text-gray-300' :
                    status === 'error'   ? 'text-rose-300' :
                                           'text-gray-600'
                  }`}>{step.label}</p>
                  {status === 'running' && pct !== undefined && (
                    <span className="text-xs text-[#00E5FF] font-medium">{pct}%</span>
                  )}
                  {status === 'done' && (
                    <span className="text-xs text-emerald-400 font-medium">Concluído</span>
                  )}
                </div>
                <p className={`text-xs ${status === 'pending' ? 'text-gray-700' : 'text-gray-500'}`}>
                  {status === 'running' ? step.sublabel : status === 'done' ? '✓ Gerado com sucesso' : status === 'error' ? 'Falhou' : step.sublabel}
                </p>

                {/* Barra de progresso */}
                {status === 'running' && pct !== undefined && (
                  <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#7B61FF] to-[#00E5FF]"
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center mb-6"
          >
            <p className="text-rose-300 text-sm mb-4">{error}</p>
            <button
              onClick={onBack}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao início
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Concluído */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <button
              onClick={() => onComplete(project.projectId)}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-[#7B61FF] to-[#00E5FF] text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(123,97,255,0.35)]"
            >
              <Film className="w-6 h-6" />
              Ver Resultado
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
