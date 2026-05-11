import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Search, Loader2, RefreshCw, ArrowLeft, Sparkles, Zap, SlidersHorizontal, CheckCircle, Settings } from 'lucide-react';
import { api, type ThemeSuggestion } from '@/src/lib/api';
import type { ProjectContext, FolderDefaults } from '@/src/types';
import FolderContextBanner from './FolderContextBanner';

interface Step1TopicProps {
  onNext: (project: ProjectContext) => void;
  onAutoGenerate: (project: ProjectContext) => void;
  folderContext?: FolderDefaults;
}

const CATEGORIES = [
  { emoji: '🌊', title: 'Mistérios do oceano', niche: 'ciência' },
  { emoji: '👽', title: 'Curiosidades bizarras', niche: 'curiosidades' },
  { emoji: '👻', title: 'Fatos assustadores', niche: 'mistério' },
  { emoji: '🚀', title: 'Mistérios da NASA', niche: 'espaço' },
  { emoji: '🦖', title: 'Animais perigosos', niche: 'natureza' },
  { emoji: '👁️', title: 'Teorias da conspiração', niche: 'conspiração' },
  { emoji: '🧠', title: 'Psicologia Sombria', niche: 'curiosidades' },
  { emoji: '🌋', title: 'Desastres Naturais', niche: 'natureza' },
  { emoji: '🕰️', title: 'Mistérios da História', niche: 'história' },
  { emoji: '🧟', title: 'Lendas Urbanas', niche: 'mistério' },
];

export default function Step1Topic({ onNext, onAutoGenerate, folderContext }: Step1TopicProps) {
  const [view, setView] = useState<'main' | 'themes'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [themes, setThemes] = useState<ThemeSuggestion[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeSuggestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingMode, setCreatingMode] = useState<'auto' | 'manual' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = async (query: string) => {
    if (!query.trim()) return;
    setIsLoadingThemes(true);
    setError(null);
    setSelectedTheme(null);
    setCurrentQuery(query);
    setView('themes');
    try {
      const result = await api.topics.suggestions(query, 10);
      setThemes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar temas');
      setThemes([]);
    } finally {
      setIsLoadingThemes(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) fetchThemes(searchQuery.trim());
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setSearchQuery(cat.title);
    fetchThemes(cat.title);
  };

  const handleStart = async (mode: 'auto' | 'manual') => {
    if (!selectedTheme || isCreating) return;
    setIsCreating(true);
    setCreatingMode(mode);
    setError(null);
    try {
      const project = await api.projects.create(selectedTheme.title, selectedTheme.niche);
      const ctx: ProjectContext = { projectId: project.id, topic: selectedTheme.title, niche: selectedTheme.niche };
      if (mode === 'auto') onAutoGenerate(ctx);
      else onNext(ctx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto');
      setIsCreating(false);
      setCreatingMode(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto px-4 py-12"
    >
      {folderContext?.folderId && (
        <div className="mb-8">
          <FolderContextBanner project={{ projectId: '', topic: '', ...folderContext }} />
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-4xl font-display font-bold mb-4">
          O que vamos criar hoje?
        </h2>
        <p className="text-gray-500 text-lg">
          Descreva um tema ou escolha uma das categorias em alta para começar.
        </p>
      </div>

      {/* Barra de pesquisa Premium */}
      <form onSubmit={handleSearchSubmit} className="mb-16">
        <div className="relative group">
          <div className="absolute inset-0 bg-ai-primary/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-[#141415] border border-white/5 rounded-3xl p-2 focus-within:border-ai-primary/50 transition-all shadow-2xl">
            <Search className="w-6 h-6 text-gray-600 ml-4 mr-2" />
            <input
              type="text"
              placeholder='Ex: "Mistérios não resolvidos da história"'
              className="flex-1 bg-transparent border-none outline-none py-4 text-gray-200 placeholder-gray-700 text-lg"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || isLoadingThemes}
              className="btn-primary py-3 px-8 rounded-2xl disabled:opacity-40"
            >
              {isLoadingThemes && view === 'themes' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Gerar Ideias</span>
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-6">Categorias em Alta</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.title}
                  onClick={() => handleCategoryClick(cat)}
                  className="glass-card aspect-square flex flex-col items-center justify-center p-4 gap-4 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    {cat.emoji}
                  </div>
                  <h4 className="text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors text-center uppercase tracking-wider">{cat.title}</h4>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="themes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => { setView('main'); setThemes([]); setSelectedTheme(null); setError(null); }}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              
              {!isLoadingThemes && (
                <button
                  onClick={() => fetchThemes(currentQuery)}
                  className="flex items-center gap-2 text-xs font-bold text-ai-secondary hover:brightness-110 transition-all uppercase tracking-widest"
                >
                  <RefreshCw className="w-4 h-4" /> Gerar Novas Ideias
                </button>
              )}
            </div>

            {isLoadingThemes ? (
              <div className="flex flex-col items-center justify-center py-24 gap-6 text-ai-primary">
                <Sparkles className="w-12 h-12 animate-pulse" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Nossa IA está criando 10 temas épicos para você...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((theme, i) => {
                  const isSelected = selectedTheme === theme;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`
                        glass-card p-6 cursor-pointer border-white/5 group
                        ${isSelected ? 'bg-ai-primary/10 border-ai-primary/40 ring-1 ring-ai-primary/20' : 'hover:bg-white/[0.03]'}
                      `}
                      onClick={() => setSelectedTheme(isSelected ? null : theme)}
                    >
                      <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-4xl shrink-0 group-hover:scale-110 transition-transform">
                          {theme.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h4 className="text-xl font-bold text-white">{theme.title}</h4>
                            {isSelected && <div className="w-6 h-6 rounded-full bg-ai-primary flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>}
                          </div>
                          <p className="text-gray-500 leading-relaxed mb-4">{theme.description}</p>
                          
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                className="flex gap-3 pt-4 border-t border-white/5"
                              >
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleStart('auto'); }}
                                  className="btn-primary flex-[1.5] py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm shadow-lg shadow-ai-primary/20 disabled:opacity-50"
                                  disabled={isCreating}
                                >
                                  {isCreating && creatingMode === 'auto' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                  Fluxo Automático
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleStart('manual'); }}
                                  className="flex-1 py-4 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 uppercase tracking-widest"
                                  disabled={isCreating}
                                >
                                  {isCreating && creatingMode === 'manual' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />}
                                  <span>Personalizar</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
