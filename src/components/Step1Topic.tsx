import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Search, Loader2, RefreshCw, ArrowLeft, Sparkles, Zap, SlidersHorizontal, CheckCircle } from 'lucide-react';
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
      const result = await api.topics.suggestions(query, 5);
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto flex flex-col"
    >
      {folderContext?.folderId && (
        <FolderContextBanner project={{ projectId: '', topic: '', ...folderContext }} />
      )}

      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider mb-4">
          <span className="text-[#00E5FF]">Etapa 1 de 5</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-semibold mb-4 text-balance">
          Sobre o que vamos criar hoje?
        </h2>
        <p className="text-gray-400">
          {view === 'main'
            ? 'Pesquise um tema ou escolha uma categoria.'
            : `5 ideias sobre "${currentQuery}" — escolha uma para continuar.`}
        </p>
      </div>

      {/* Barra de pesquisa */}
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center bg-[#141415] border border-[#ffffff1a] rounded-2xl px-4 focus-within:border-[#7B61FF]/50 transition-colors">
            <Search className="w-5 h-5 text-gray-500 shrink-0 mr-3" />
            <input
              type="text"
              placeholder='Ex: "A história oculta de Nikola Tesla"'
              className="flex-1 bg-transparent border-none outline-none py-3.5 text-white placeholder-gray-600 text-base min-w-0"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isLoadingThemes}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#7B61FF] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#6B51EF] transition-colors whitespace-nowrap"
          >
            {isLoadingThemes && view === 'themes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar Temas
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <TrendingUp className="w-5 h-5 text-[#00E5FF]" />
              <h3 className="font-semibold text-lg text-gray-200">Em Alta <span className="text-gray-500 font-normal ml-2">Trending</span></h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat, i) => (
                <motion.button
                  key={cat.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleCategoryClick(cat)}
                  className="p-5 rounded-2xl text-left bg-[#141415]/50 border border-[#ffffff0a] hover:bg-[#1A1A1E] hover:border-[#7B61FF]/30 transition-all duration-200 group"
                >
                  <div className="text-3xl mb-3">{cat.emoji}</div>
                  <h4 className="font-semibold text-white group-hover:text-[#00E5FF] transition-colors text-sm">{cat.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{cat.niche}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="themes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => { setView('main'); setThemes([]); setSelectedTheme(null); setError(null); }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={() => fetchThemes(currentQuery)}
                disabled={isLoadingThemes}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 font-medium transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingThemes ? 'animate-spin' : ''}`} />
                Gerar mais temas
              </button>
            </div>

            {isLoadingThemes ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[#7B61FF]/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#7B61FF] border-r-[#00E5FF] border-b-transparent border-l-transparent animate-spin" />
                </div>
                <p className="text-gray-400 text-sm">Gerando 5 temas únicos sobre <span className="text-white font-medium">"{currentQuery}"</span>...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12 text-rose-400 text-sm">
                <p>{error}</p>
                <button onClick={() => fetchThemes(currentQuery)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">Tentar novamente</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {themes.map((theme, i) => {
                  const isSelected = selectedTheme === theme;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#7B61FF]/20 to-[#00E5FF]/10 border-[#7B61FF]/60 shadow-[0_0_24px_rgba(123,97,255,0.2)]'
                          : 'bg-[#141415]/50 border-[#ffffff0a] hover:bg-[#1A1A1E] hover:border-[#7B61FF]/30'
                      }`}
                    >
                      {/* Info do tema — clicável */}
                      <button
                        onClick={() => setSelectedTheme(isSelected ? null : theme)}
                        disabled={isCreating}
                        className="w-full text-left p-4 disabled:opacity-50"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl sm:text-3xl flex-shrink-0">{theme.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white leading-tight text-sm sm:text-base">{theme.title}</h4>
                              {isSelected && <CheckCircle className="w-4 h-4 text-[#7B61FF] flex-shrink-0" />}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 mb-1">{theme.description}</p>
                            <p className="text-xs text-[#00E5FF]/70 italic">"{theme.hook}"</p>
                          </div>
                        </div>
                      </button>

                      {/* Botões de modo — no mobile ficam embaixo, no desktop ao lado */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {isCreating ? (
                              <div className="flex items-center justify-center gap-2 py-3 text-gray-400 border-t border-[#7B61FF]/20">
                                <Loader2 className="w-4 h-4 animate-spin text-[#7B61FF]" />
                                <span className="text-xs">{creatingMode === 'auto' ? 'Iniciando automático...' : 'Criando projeto...'}</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 p-3 border-t border-[#7B61FF]/20">
                                {/* Automático */}
                                <button
                                  onClick={() => handleStart('auto')}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-br from-[#7B61FF]/30 to-[#00E5FF]/15 border border-[#7B61FF]/50 hover:border-[#7B61FF]/80 transition-all"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B61FF] to-[#00E5FF] flex items-center justify-center shrink-0">
                                    <Zap className="w-3.5 h-3.5 text-white" />
                                  </div>
                                  <div className="text-left min-w-0">
                                    <p className="text-xs font-bold text-white leading-none mb-0.5">Automático</p>
                                    <p className="text-[10px] text-[#00E5FF]/60">~3 min</p>
                                  </div>
                                </button>

                                {/* Manual */}
                                <button
                                  onClick={() => handleStart('manual')}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-[#1A1A1E] hover:border-white/20 transition-all"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-300" />
                                  </div>
                                  <div className="text-left min-w-0">
                                    <p className="text-xs font-bold text-white leading-none mb-0.5">Manual</p>
                                    <p className="text-[10px] text-gray-500">Passo a passo</p>
                                  </div>
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {error && (
                  <p className="text-sm text-rose-400 text-center mt-2">{error}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
