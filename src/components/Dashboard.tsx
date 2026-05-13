import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, History, TrendingUp, Clock,
  Video, Play, CheckCircle, Loader2,
  Trash2, Pencil, X, AlertTriangle, Youtube,
  Sparkles,
  ArrowRight,
  Zap,
  Clapperboard,
} from 'lucide-react';
import { api, type ApiProject } from '../lib/api';

interface DashboardProps {
  onStartProject: () => void;
  onEditProject: (project: ApiProject) => void;
  onExportProject: (project: ApiProject) => void;
}

export default function Dashboard({ onStartProject, onEditProject, onExportProject }: DashboardProps) {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiProject | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await api.projects.list();
        setProjects(data);
      } catch (err) {
        console.error('Erro ao carregar projetos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await api.projects.delete(deleteConfirm.id);
      setProjects(prev => prev.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const completedCount = projects.filter(p => p.status === 'completed').length;
  const inProgressCount = projects.filter(p => p.status !== 'completed' && p.status !== 'error').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8 sm:space-y-12 pb-24 sm:pb-32 px-4 sm:px-6"
    >
      {/* Top Section with Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-8 pt-6 sm:pt-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-ai-primary/10 border border-ai-primary/20 w-fit">
            <span className="text-[9px] font-bold text-ai-primary uppercase tracking-[0.2em]">Visão Geral</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-gray-500 font-medium text-sm">Bem-vindo de volta. Sua produção está em dia.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-card px-8 py-4 border-white/5 bg-[#141415]/40 flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Prontos</span>
            <span className="text-2xl font-display font-bold text-white">{completedCount}</span>
          </div>
          <div className="glass-card px-8 py-4 border-white/5 bg-[#141415]/40 flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Processando</span>
            <span className="text-2xl font-display font-bold text-ai-primary">{inProgressCount}</span>
          </div>
        </div>
      </div>

      {/* Main Actions - Replaced Big Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div 
          onClick={onStartProject}
          className="md:col-span-8 group relative h-48 rounded-[2rem] bg-[#141415] border border-white/5 p-10 cursor-pointer overflow-hidden transition-all hover:border-ai-primary/40 hover:bg-[#1A1A1E]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-ai-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 h-full flex items-center justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-ai-primary/10 flex items-center justify-center text-ai-primary group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">Criar Novo Vídeo</h2>
                <p className="text-gray-500 text-sm font-medium">Inicie uma nova produção cinematográfica com IA.</p>
              </div>
            </div>
            <ArrowRight className="w-8 h-8 text-gray-800 group-hover:text-ai-primary group-hover:translate-x-2 transition-all" />
          </div>
        </div>

        <div className="md:col-span-4 glass-card p-10 flex flex-col justify-between items-start border-white/5 hover:bg-[#141415] transition-colors group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-ai-secondary group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">Ver Tendências</h3>
            <p className="text-gray-600 text-xs leading-relaxed">Inspire-se com os nichos mais virais de hoje.</p>
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-bold">Histórico Recente</h3>
          </div>
          <button className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Ver Biblioteca</button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-gray-700">
            <Loader2 className="w-10 h-10 animate-spin text-ai-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 glass-card flex flex-col items-center gap-6 text-center border-dashed border-white/10 bg-transparent">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center text-gray-800">
              <Clapperboard className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Sua galeria está vazia. Comece criando seu primeiro vídeo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-8">
            {projects.slice(0, 5).map((p, i) => (
              <DashboardProjectCard 
                key={p.id}
                project={p}
                index={i}
                onEdit={() => onEditProject(p)}
                onDelete={() => setDeleteConfirm(p)}
                onExport={() => onExportProject(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative glass-card p-10 max-w-sm text-center space-y-8">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold">Excluir Projeto?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Você perderá o vídeo e todos os arquivos gerados permanentemente.</p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button onClick={handleDeleteConfirm} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/20">Sim, Excluir</button>
                <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DashboardProjectCard({ project, index, onEdit, onDelete, onExport }: any) {
  const [imgError, setImgError] = useState(false);
  const isDone = project.status === 'completed';
  const isProgress = ['generating_script','generating_narration','generating_images','rendering'].includes(project.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex flex-col bg-[#141415] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-ai-primary/30 transition-all duration-500"
    >
      <div className="aspect-[9/16] relative bg-[#0A0A0B] overflow-hidden">
        {project.thumbnail_url && !imgError ? (
          <img 
            src={project.thumbnail_url.startsWith('http') ? project.thumbnail_url : `${api.getBaseUrl()}${project.thumbnail_url}`} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            alt="" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#141415] to-[#0A0A0B] relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
            {isProgress ? (
              <Loader2 className="w-6 h-6 text-ai-primary animate-spin" />
            ) : (
              <Clapperboard className="w-12 h-12 text-white opacity-5" />
            )}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
          {isDone ? (
            <button onClick={onExport} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-black" />
            </button>
          ) : (
            <button onClick={onEdit} className="w-12 h-12 rounded-full bg-ai-primary text-white flex items-center justify-center hover:scale-110 transition-transform">
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <button onClick={onDelete} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-rose-500 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute top-5 left-5">
          <div className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border backdrop-blur-xl ${
            isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
          }`}>
            {isDone ? 'Pronto' : 'Criando'}
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          <h4 className="text-base font-display font-bold text-white mb-1 group-hover:text-ai-primary transition-colors truncate">
            {project.title || project.topic}
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Recente</span>
            {project.youtube_url && <Youtube className="w-3.5 h-3.5 text-red-600" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
