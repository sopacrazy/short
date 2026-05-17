import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Folder, Trash2, Pencil, X, Loader2,
  Play, Clapperboard, Youtube, Instagram, Settings2,
  Clock, Hash, Palette, FolderPlus,
  Share2, ChevronRight, Eye, Mic2, Languages, Zap, CheckCircle, UserCircle
} from 'lucide-react';
import { api, type ApiProject, type ApiFolder, type Voice, type YouTubeAccount } from '@/src/lib/api';

interface ProjectsViewProps {
  onStartProject: (defaults?: any) => void;
  onEditProject: (project: ApiProject) => void;
  onExportProject: (project: ApiProject) => void;
  youtubeAccounts?: YouTubeAccount[];
}

export default function ProjectsView({ onStartProject, onEditProject, onExportProject, youtubeAccounts = [] }: ProjectsViewProps) {
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showFolderSettings, setShowFolderSettings] = useState<ApiFolder | null>(null);
  const [moveProject, setMoveProject] = useState<ApiProject | null>(null);
  const [editFolder, setEditFolder] = useState({
    name: '', emoji: '', color: '', voiceId: '', lang: '', tags: '',
    autoPublishYoutube: false, autoPublishInstagram: false,
    youtubeAccountId: '' as string
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ApiProject | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [f, p] = await Promise.all([api.folders.list(), api.projects.list()]);
      setFolders(f); setProjects(p);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  // Voices carregadas sob demanda — só quando o modal de configuração abre
  const loadVoicesIfNeeded = async () => {
    if (voices.length === 0) {
      try { setVoices(await api.narration.voices()); } catch { /* silencioso */ }
    }
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
        default_youtube_tags: tagsArray,
        auto_publish_youtube: editFolder.autoPublishYoutube,
        auto_publish_instagram: editFolder.autoPublishInstagram,
        youtube_account_id: editFolder.youtubeAccountId || null,
      });
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      setShowFolderSettings(null);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 sm:pb-32 px-4 sm:px-6">
      
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
          <div className="relative group/btn">
            <button
              onClick={() => {
                if (!selectedFolder) return;
                onStartProject({
                  folderId: selectedFolder.id,
                  folderName: selectedFolder.name,
                  folderEmoji: selectedFolder.emoji,
                  defaultVoiceId: selectedFolder.default_voice_id ?? undefined,
                  defaultLanguage: selectedFolder.default_language ?? 'pt',
                  defaultTags: selectedFolder.default_youtube_tags ?? []
                });
              }}
              disabled={!selectedFolder}
              className="btn-primary py-2.5 px-6 rounded-xl text-sm font-bold shadow-lg shadow-ai-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Short</span>
            </button>
            {!selectedFolder && (
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-[#1a1a1b] border border-white/10 rounded-xl text-[11px] text-gray-400 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-10">
                Selecione uma pasta para criar um Short
              </div>
            )}
          </div>
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
                tags: selectedFolder.default_youtube_tags?.join(', ') || '',
                autoPublishYoutube: selectedFolder.auto_publish_youtube ?? false,
                autoPublishInstagram: selectedFolder.auto_publish_instagram ?? false,
                youtubeAccountId: selectedFolder.youtube_account_id || '',
              });
              setShowFolderSettings(selectedFolder);
              loadVoicesIfNeeded();
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
           <ModalOverlay onClose={() => setShowFolderSettings(null)} className="max-w-3xl">
            <div className="space-y-8">
              {/* Header com Design de Camadas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-ai-primary/10 flex items-center justify-center text-ai-primary border border-ai-primary/20 shadow-lg shadow-ai-primary/5">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-white tracking-tight">Ajustes da Pasta</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Configure automação e padrões</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (confirm('Deseja excluir permanentemente esta pasta e todos os seus vídeos?')) {
                      await api.folders.delete(showFolderSettings.id);
                      setFolders(prev => prev.filter(f => f.id !== showFolderSettings.id));
                      setSelectedFolderId(null);
                      setShowFolderSettings(null);
                    }
                  }} 
                  className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-300 group border border-rose-500/20"
                  title="Excluir Pasta"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna 1: Identidade e Automação */}
                <div className="space-y-6">
                  {/* Card: Identidade */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                      <Palette className="w-3.5 h-3.5" /> Identidade Visual
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                       <div className="col-span-1 space-y-2">
                        <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Emoji</label>
                        <input 
                          type="text" value={editFolder.emoji} 
                          onChange={e => setEditFolder({ ...editFolder, emoji: e.target.value })} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-xl focus:border-ai-primary/50 transition-all outline-none" 
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Nome da Pasta</label>
                        <input 
                          type="text" value={editFolder.name} 
                          onChange={e => setEditFolder({ ...editFolder, name: e.target.value })} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:border-ai-primary/50 transition-all outline-none" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card: Automação */}
                  <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">
                      <Zap className="w-3.5 h-3.5" /> Automação de Postagem
                    </div>
                    
                    <div className="space-y-3">
                      <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${editFolder.autoPublishYoutube ? 'bg-red-500/5 border-red-500/20' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${editFolder.autoPublishYoutube ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-gray-600'}`}>
                            <Youtube className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={`text-xs font-bold transition-colors ${editFolder.autoPublishYoutube ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>YouTube Shorts</p>
                            <p className="text-[9px] text-gray-500 font-medium">Publicação Automática</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${editFolder.autoPublishYoutube ? 'bg-red-500 border-red-500' : 'border-white/10'}`}>
                          <input 
                            type="checkbox" checked={editFolder.autoPublishYoutube} 
                            onChange={e => setEditFolder({ ...editFolder, autoPublishYoutube: e.target.checked })}
                            className="hidden" 
                          />
                          {editFolder.autoPublishYoutube && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </label>

                    {/* Seletor de conta YouTube para esta pasta */}
                    {youtubeAccounts.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <UserCircle className="w-3 h-3" /> Conta YouTube desta Pasta
                        </label>
                        <div className="relative group">
                          <select
                            value={editFolder.youtubeAccountId}
                            onChange={e => setEditFolder({ ...editFolder, youtubeAccountId: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs font-bold text-white appearance-none cursor-pointer focus:border-red-500/50 transition-all outline-none pr-8"
                          >
                            <option value="">Nenhuma (não publicar no YouTube)</option>
                            {youtubeAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.channel_name ?? 'Canal sem nome'}
                              </option>
                            ))}
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    )}

                      <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${editFolder.autoPublishInstagram ? 'bg-pink-500/5 border-pink-500/20' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${editFolder.autoPublishInstagram ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 text-gray-600'}`}>
                            <Instagram className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={`text-xs font-bold transition-colors ${editFolder.autoPublishInstagram ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>Instagram Reels</p>
                            <p className="text-[9px] text-gray-500 font-medium">Publicação Automática</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${editFolder.autoPublishInstagram ? 'bg-pink-500 border-pink-500' : 'border-white/10'}`}>
                          <input 
                            type="checkbox" checked={editFolder.autoPublishInstagram} 
                            onChange={e => setEditFolder({ ...editFolder, autoPublishInstagram: e.target.checked })}
                            className="hidden" 
                          />
                          {editFolder.autoPublishInstagram && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Padrões de Produção */}
                <div className="space-y-6">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-ai-primary/[0.03] to-transparent border border-ai-primary/10 space-y-6 h-full flex flex-col">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-ai-primary uppercase tracking-widest mb-2">
                      <Clapperboard className="w-3.5 h-3.5" /> Padrões de Geração
                    </div>

                    <div className="space-y-5 flex-1">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Mic2 className="w-3 h-3" /> Narrador ElevenLabs
                        </label>
                        <div className="relative group">
                          <select 
                            value={editFolder.voiceId}
                            onChange={e => setEditFolder({ ...editFolder, voiceId: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white appearance-none cursor-pointer focus:border-ai-primary/50 transition-all outline-none pr-10"
                          >
                            <option value="">Nenhum (Usar padrão)</option>
                            {voices.map(v => (
                              <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                            ))}
                          </select>
                          <ChevronRight className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none transition-transform group-hover:text-white" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Languages className="w-3 h-3" /> Idioma dos Scripts
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'pt', label: 'Português', icon: '🇧🇷' },
                            { id: 'en', label: 'Inglês', icon: '🇺🇸' },
                            { id: 'es', label: 'Espanhol', icon: '🇪🇸' }
                          ].map(l => (
                            <button
                              key={l.id}
                              onClick={() => setEditFolder({ ...editFolder, lang: l.id })}
                              className={`py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${editFolder.lang === l.id ? 'bg-ai-primary border-ai-primary text-white shadow-lg shadow-ai-primary/20' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'}`}
                            >
                              <span className="mr-1">{l.icon}</span> {l.id}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Hash className="w-3 h-3" /> Hashtags Padrão
                        </label>
                        <textarea 
                          value={editFolder.tags}
                          onChange={e => setEditFolder({ ...editFolder, tags: e.target.value })}
                          rows={4}
                          placeholder="Ex: curiosidades, fatos, sabiondo..."
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-medium text-gray-300 resize-none focus:border-ai-primary/50 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações Finais */}
              <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setShowFolderSettings(null)} 
                  className="flex-1 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateFolder} 
                  disabled={isProcessing} 
                  className="flex-[2] py-4 bg-gradient-to-r from-ai-primary to-ai-secondary text-white rounded-2xl text-sm font-bold shadow-xl shadow-ai-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Salvar Configurações</span>
                    </>
                  )}
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
                <button 
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await api.projects.delete(deleteProject.id);
                      setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
                      setDeleteProject(null);
                    } catch (err) {
                      console.error('Erro ao excluir:', err);
                    } finally {
                      setIsProcessing(false);
                    }
                  }} 
                  className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Excluir Agora'}
                </button>
                <button disabled={isProcessing} onClick={() => setDeleteProject(null)} className="w-full py-4 text-xs font-bold text-gray-500">Voltar</button>
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
  // Se tem video_url, já está pronto para o usuário, independente do status textual
  const isDone = project.status === 'completed' || !!project.video_url;
  const isProgress = ['generating_script','generating_narration','generating_images','rendering'].includes(project.status) && !project.video_url;
  
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
            <div className="flex items-center gap-2">
              {project.youtube_url && <Youtube className="w-3.5 h-3.5 text-red-600" />}
              {project.instagram_url && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ModalOverlay({ children, onClose, className = "max-w-sm" }: { children: React.ReactNode; onClose: () => void, className?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`relative bg-[#0A0A0B] border border-white/10 p-5 sm:p-8 rounded-[2.5rem] w-full shadow-2xl overflow-hidden ${className}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ai-primary to-ai-secondary" />
        {children}
      </motion.div>
    </div>
  );
}
