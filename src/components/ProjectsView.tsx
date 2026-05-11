import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Folder, Trash2, Pencil, X, Loader2,
  Play, Clapperboard, Youtube, Settings2,
  Clock, Hash, Palette, FolderPlus,
  Share2, ChevronRight, Eye
} from 'lucide-react';
import { api, type ApiProject, type ApiFolder, type Voice } from '@/src/lib/api';

interface ProjectsViewProps {
  onStartProject: (defaults?: any) => void;
  onEditProject: (project: ApiProject) => void;
  onExportProject: (project: ApiProject) => void;
}

export default function ProjectsView({ onStartProject, onEditProject, onExportProject }: ProjectsViewProps) {
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showFolderSettings, setShowFolderSettings] = useState<ApiFolder | null>(null);
  const [moveProject, setMoveProject] = useState<ApiProject | null>(null);
  const [editFolder, setEditFolder] = useState({ 
    name: '', emoji: '', color: '', voiceId: '', lang: '', tags: '' 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ApiProject | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [f, p, v] = await Promise.all([api.folders.list(), api.projects.list(), api.narration.voices()]);
      setFolders(f); setProjects(p); setVoices(v);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const filteredProjects = selectedFolderId === null ? projects : projects.filter(p => p.folder_id === selectedFolderId);

  const handleMoveProject = async (folderId: string | null) => {
    if (!moveProject) return;
    try {
      await api.projects.moveToFolder(moveProject.id, folderId);
      setProjects(prev => prev.map(p => p.id === moveProject.id ? { ...p, folder_id: folderId } : p));
      setMoveProject(null);
    } catch (err) { console.error(err); }
  };

  const handleUpdateFolder = async () => {
    if (!showFolderSettings) return;
    setIsProcessing(true);
    try {
      const tagsArray = editFolder.tags.split(',').map(t => t.trim()).filter(Boolean);
      const updated = await api.folders.update(showFolderSettings.id, {
        name: editFolder.name,
        emoji: editFolder.emoji,
        color: editFolder.color,
        default_voice_id: editFolder.voiceId || null,
        default_language: editFolder.lang,
        default_youtube_tags: tagsArray
      });
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      setShowFolderSettings(null);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-8 pb-32 px-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pt-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">
            {selectedFolder ? selectedFolder.name : 'Meus Projetos'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-ai-primary uppercase tracking-widest">Biblioteca</span>
            <span className="text-[10px] text-gray-600 uppercase font-bold">• {projects.length} Vídeos</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateFolder(true)} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all">
            <Folder className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              const defaults = selectedFolder ? {
                folderId: selectedFolder.id,
                folderName: selectedFolder.name,
                folderEmoji: selectedFolder.emoji,
                defaultVoiceId: selectedFolder.default_voice_id ?? undefined,
                defaultLanguage: selectedFolder.default_language ?? 'pt'
              } : undefined;
              onStartProject(defaults);
            }} 
            className="btn-primary py-2.5 px-6 rounded-xl text-sm font-bold shadow-lg shadow-ai-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Short</span>
          </button>
        </div>
      </div>

      {/* Folders List */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedFolderId(null)}
          className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
            selectedFolderId === null ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
          }`}
        >
          Todos os Vídeos
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFolderId(f.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
              selectedFolderId === f.id ? 'bg-ai-primary text-white border-ai-primary' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
            }`}
          >
            <span style={{ color: selectedFolderId === f.id ? '#fff' : f.color }}>{f.emoji}</span>
            <span>{f.name}</span>
          </button>
        ))}
        {selectedFolder && (
          <button 
            onClick={() => {
              setEditFolder({
                name: selectedFolder.name,
                emoji: selectedFolder.emoji,
                color: selectedFolder.color,
                voiceId: selectedFolder.default_voice_id || '',
                lang: selectedFolder.default_language || 'pt',
                tags: selectedFolder.default_youtube_tags?.join(', ') || ''
              });
              setShowFolderSettings(selectedFolder);
            }} 
            className="ml-2 p-2.5 rounded-xl bg-white/5 text-ai-primary hover:bg-ai-primary hover:text-white transition-all"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-700">
            <Loader2 className="w-8 h-8 animate-spin text-ai-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <Clapperboard className="w-10 h-10 text-gray-800 mx-auto opacity-20" />
            <p className="text-gray-600 text-xs font-medium uppercase tracking-widest">Pasta Vazia</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  index={i}
                  onEdit={() => onEditProject(p)}
                  onDelete={() => setDeleteProject(p)}
                  onExport={() => onExportProject(p)}
                  onMove={() => setMoveProject(p)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals - (Keep existing logic) */}
      <AnimatePresence>
        {moveProject && (
          <ModalOverlay onClose={() => setMoveProject(null)}>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <FolderPlus className="w-5 h-5 text-ai-primary" />
                <h3 className="text-lg font-bold">Mover para Pasta</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => handleMoveProject(null)}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/5 text-left text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-3"
                >
                  🚀 Sem Pasta (Raiz)
                </button>
                {folders.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => handleMoveProject(f.id)}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/5 text-left text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    <span>{f.emoji}</span>
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </ModalOverlay>
        )}

        {showFolderSettings && (
           <ModalOverlay onClose={() => setShowFolderSettings(null)}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5 text-ai-primary" />
                  <h3 className="text-lg font-bold">Configurações</h3>
                </div>
                <button onClick={async () => {
                  if (confirm('Deletar pasta?')) {
                    await api.folders.delete(showFolderSettings.id);
                    setFolders(prev => prev.filter(f => f.id !== showFolderSettings.id));
                    setSelectedFolderId(null);
                    setShowFolderSettings(null);
                  }
                }} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                   <div className="col-span-1 space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ícone</label>
                    <input type="text" value={editFolder.emoji} onChange={e => setEditFolder({ ...editFolder, emoji: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-center" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nome</label>
                    <input type="text" value={editFolder.name} onChange={e => setEditFolder({ ...editFolder, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold" />
                  </div>
                </div>
                {/* ... existing settings fields ... */}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button onClick={() => setShowFolderSettings(null)} className="flex-1 py-3 text-xs font-bold text-gray-500">Cancelar</button>
                <button onClick={handleUpdateFolder} disabled={isProcessing} className="flex-1 py-3 bg-ai-primary text-white rounded-xl text-xs font-bold">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {showCreateFolder && (
          <ModalOverlay onClose={() => setShowCreateFolder(false)}>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-ai-primary" />
                <h3 className="text-xl font-bold">Nova Pasta</h3>
              </div>
              <input 
                autoFocus type="text" value={editFolder.name} 
                onChange={e => setEditFolder({ ...editFolder, name: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-ai-primary"
                placeholder="Nome..."
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCreateFolder(false)} className="flex-1 py-3 text-xs font-bold text-gray-500">Sair</button>
                <button onClick={async () => {
                   if (!editFolder.name.trim()) return;
                   const folder = await api.folders.create(editFolder.name, '📁', '#7B61FF');
                   setFolders(prev => [...prev, folder]);
                   setShowCreateFolder(false);
                }} className="flex-1 py-3 bg-white text-black rounded-xl text-xs font-bold">Criar</button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {deleteProject && (
          <ModalOverlay onClose={() => setDeleteProject(null)}>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Excluir Vídeo?</h3>
              <div className="flex flex-col gap-3">
                <button onClick={async () => {
                    await api.projects.delete(deleteProject.id);
                    setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
                    setDeleteProject(null);
                  }} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold">Excluir Agora</button>
                <button onClick={() => setDeleteProject(null)} className="w-full py-4 text-xs font-bold text-gray-500">Voltar</button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectCard({ project, index, onEdit, onDelete, onExport, onMove }: any) {
  const [imgError, setImgError] = useState(false);
  const isDone = project.status === 'completed';
  const isProgress = ['generating_script','generating_narration','generating_images','rendering'].includes(project.status);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="group relative flex flex-col bg-[#0A0A0B] border border-white/5 rounded-3xl overflow-hidden hover:border-ai-primary/20 transition-all duration-500 shadow-2xl"
    >
      {/* Aspect Ratio Container (9:16) */}
      <div className="aspect-[9/16] relative">
        {project.thumbnail_url && !imgError ? (
          <img 
            src={project.thumbnail_url.startsWith('http') ? project.thumbnail_url : `${api.getBaseUrl()}${project.thumbnail_url}`} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt="" 
            onError={() => setImgError(true)} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#141415] to-[#0A0A0B]">
            {isProgress ? <Loader2 className="w-6 h-6 animate-spin text-ai-primary" /> : <Clapperboard className="w-12 h-12 text-white/5" />}
          </div>
        )}

        {/* Vertical Actions Bar - Right Side */}
        <div className="absolute top-4 right-3 bottom-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          {isDone ? (
            <button onClick={onExport} className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl" title="Ver / Publicar">
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button onClick={onEdit} className="w-9 h-9 rounded-xl bg-ai-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl" title="Editar / Criar">
              <Pencil className="w-4 h-4" />
            </button>
          )}

          <button onClick={onMove} className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-ai-primary hover:scale-110 transition-all border border-white/10" title="Mover para Pasta">
            <FolderPlus className="w-4 h-4" />
          </button>

          <div className="mt-auto flex flex-col gap-2">
            {isDone && (
              <button onClick={onEdit} className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md text-gray-300 flex items-center justify-center hover:text-white transition-all border border-white/10" title="Ajustar Roteiro">
                <Settings2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onDelete} className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-white/10" title="Remover">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />

        {/* Info Labels */}
        <div className="absolute top-4 left-4">
          <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border backdrop-blur-md shadow-lg ${isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
            {isDone ? 'PRONTO' : 'CRIANDO'}
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <h4 className="text-[12px] font-bold text-white truncate mb-1 group-hover:text-ai-primary transition-colors">{project.title || project.topic}</h4>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-500 font-bold flex items-center gap-1.5 uppercase tracking-tighter">
              <Clock className="w-3 h-3" /> {new Date(project.created_at).toLocaleDateString()}
            </span>
            {project.youtube_url && <Youtube className="w-3.5 h-3.5 text-red-600" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#0A0A0B] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ai-primary to-ai-secondary" />
        {children}
      </motion.div>
    </div>
  );
}
