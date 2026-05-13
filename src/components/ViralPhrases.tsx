import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, Send, Loader2, Download, RefreshCw, Layers, Type, Palette, Camera } from 'lucide-react';
import { api } from '../lib/api';
import Toast from './Toast';

export default function ViralPhrases() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [template, setTemplate] = useState('classic');

  const TEMPLATES = ['classic', 'minimal', 'bold', 'elegant', 'handwritten', 'magazine'];

  const handleGenerate = async () => {
    if (!query) return;
    setLoading(true);
    setResult(null);
    setImageUrl(null);
    try {
      const data = await api.viralPhrases.generate(query);
      setResult(data);
      // Pick a truly random template
      setTemplate(TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]);
      
      if (data.prompt) {
        handleGenerateImage(data.prompt);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao comunicar com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    setGeneratingImage(true);
    try {
      const { url } = await api.images.generate({ prompt });
      setImageUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar imagem. Verifique o console ou o tempo limite.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setResult((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-12">
      {/* Header & Input */}
      <div className="text-center space-y-4 sm:space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-ai-primary/10 border border-ai-primary/20 text-ai-primary mb-2">
          <Quote className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">Post de Frases Virais</h2>
        <p className="text-gray-500 max-w-xl mx-auto text-base sm:text-lg">
          Crie artes cinematográficas editáveis em tempo real para suas redes sociais.
        </p>

        <div className="relative max-w-2xl mx-auto mt-6 sm:mt-10 group">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Ex: Motivação para segunda-feira, Solidão na cidade, Superação..."
            className="w-full bg-black/40 border-2 border-white/5 rounded-3xl py-4 sm:py-6 px-5 sm:px-8 text-base sm:text-xl font-medium focus:border-ai-primary/50 transition-all outline-none pr-24 sm:pr-32 placeholder:text-gray-700"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !query}
            className="absolute right-2 top-2 bottom-2 px-4 sm:px-6 bg-gradient-to-r from-ai-primary to-ai-secondary text-white rounded-2xl font-bold flex items-center gap-2 sm:gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /><span className="hidden xs:inline">Criar</span></>}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 pt-4 sm:pt-8"
          >
            {/* Detalhes da Composição (Editáveis) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-ai-primary uppercase tracking-[0.2em]">Design Ativo</span>
                  <h3 className="text-2xl font-bold capitalize">{template} Style</h3>
                </div>
                <button 
                  onClick={() => setTemplate(TEMPLATES[(TEMPLATES.indexOf(template) + 1) % TEMPLATES.length])}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                  title="Mudar Template"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                    <Type className="w-3.5 h-3.5" /> Conteúdo do Post
                  </span>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Pré-Título</label>
                      <input 
                        value={result.texto_pre_titulo || ''} 
                        onChange={(e) => updateField('texto_pre_titulo', e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Palavra-Chave</label>
                      <input 
                        value={result.palavra_chave || ''} 
                        onChange={(e) => updateField('palavra_chave', e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold text-ai-primary focus:border-ai-primary/50 outline-none transition-all uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Mensagem</label>
                      <textarea 
                        value={result.texto_pos_titulo || ''} 
                        onChange={(e) => updateField('texto_pos_titulo', e.target.value)}
                        rows={2}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase px-1">Referência (Rodapé)</label>
                      <input 
                        value={result.referencia || ''} 
                        onChange={(e) => updateField('referencia', e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-ai-primary/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5" /> Cores
                    </span>
                    <p className="text-xs text-gray-400">{result.cores}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5" /> Cena
                    </span>
                    <p className="text-[10px] text-gray-500 line-clamp-2">{result.tema_visual}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  <span>Prompt de IA</span>
                  <button className="text-ai-primary hover:underline">Copiar</button>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed italic line-clamp-2">{result.prompt}</p>
              </div>
            </div>

            {/* Preview Vertical 9:16 */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative aspect-[9/16] w-full max-w-[280px] sm:max-w-[320px] rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group">
                {generatingImage ? (
                  <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-ai-primary/20 border-t-ai-primary animate-spin" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">Criando Visual...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img src={imageUrl} className="w-full h-full object-cover" alt="Viral Post" />
                    
                    {/* Gradiente do Meio para Baixo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-100" />
                    
                    <div className="absolute inset-0 p-8 flex flex-col justify-end text-center pb-16">
                      <motion.div
                        key={template}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`space-y-0 ${template === 'bold' ? 'text-left' : 'text-center'}`}
                      >
                        {/* Template Logic */}
                        {template === 'classic' && (
                          <>
                            <p className="text-lg text-white font-premium-serif italic mb-1">{result.texto_pre_titulo}</p>
                            <h4 className="text-6xl font-bold text-gold uppercase tracking-tighter mb-2 font-premium-display leading-none">{result.palavra_chave}</h4>
                            <p className="text-base text-white font-premium-serif leading-tight px-4 opacity-90">{result.texto_pos_titulo}</p>
                            <div className="py-4 flex flex-col items-center gap-2">
                              <div className="h-[0.5px] w-24 bg-gradient-to-r from-transparent via-[#E2B04A]/40 to-transparent" />
                              <Sparkles className="w-3 h-3 text-[#E2B04A] opacity-60" />
                              <div className="h-[0.5px] w-24 bg-gradient-to-r from-transparent via-[#E2B04A]/40 to-transparent" />
                            </div>
                          </>
                        )}

                        {template === 'minimal' && (
                          <>
                            <p className="text-sm text-white/60 font-medium uppercase tracking-[0.2em] mb-3">{result.texto_pre_titulo}</p>
                            <h4 className="text-4xl font-light text-white mb-4 tracking-wide">{result.palavra_chave}</h4>
                            <p className="text-lg text-white font-light italic leading-relaxed">{result.texto_pos_titulo}</p>
                            <div className="h-8" />
                          </>
                        )}

                        {template === 'bold' && (
                          <div className="space-y-4">
                            <h4 className="text-5xl font-black text-white uppercase leading-[0.9] border-l-4 border-ai-primary pl-4">{result.palavra_chave}</h4>
                            <p className="text-xl font-bold text-white/90 leading-tight pl-4">{result.texto_pos_titulo}</p>
                            <p className="text-[10px] text-ai-primary font-black uppercase tracking-widest pl-4">{result.referencia}</p>
                          </div>
                        )}

                        {template === 'elegant' && (
                          <>
                            <div className="mb-6 opacity-30"><Quote className="w-8 h-8 mx-auto" /></div>
                            <h4 className="text-3xl font-premium-serif italic text-white/90 mb-4 px-2 leading-tight">"{result.texto_pre_titulo} {result.palavra_chave} {result.texto_pos_titulo}"</h4>
                            <div className="w-12 h-[2px] bg-white/20 mx-auto mb-4" />
                          </>
                        )}

                        {template === 'handwritten' && (
                          <div className="text-center px-4 space-y-2">
                            <p className="text-4xl font-premium-script text-white/90 leading-tight drop-shadow-lg">
                              {result.texto_pre_titulo} {result.palavra_chave}
                            </p>
                            <p className="text-4xl font-premium-script text-white/90 leading-tight drop-shadow-lg">
                              {result.texto_pos_titulo}
                            </p>
                            <div className="h-6" />
                          </div>
                        )}

                        {template === 'magazine' && (
                          <div className="text-left px-2 space-y-1">
                            <h4 className="text-[80px] font-black font-premium-sans text-white uppercase leading-[0.8] tracking-tighter">
                              {result.palavra_chave}
                            </h4>
                            <div className="h-1 w-20 bg-ai-primary mb-4" />
                            <p className="text-xl font-medium font-premium-sans text-white/80 uppercase tracking-widest leading-none">
                              {result.texto_pre_titulo}
                            </p>
                            <p className="text-sm font-light font-premium-sans text-white/60 uppercase tracking-[0.3em]">
                              {result.texto_pos_titulo}
                            </p>
                          </div>
                        )}

                        {/* Common Reference for most templates */}
                        {template !== 'bold' && template !== 'magazine' && result.referencia && (
                          <p className={`text-[9px] font-bold uppercase tracking-[0.4em] opacity-70 ${template === 'classic' ? 'text-[#E2B04A]' : template === 'handwritten' ? 'text-white/50 italic' : 'text-white'}`}>
                            {result.referencia}
                          </p>
                        )}
                        
                        {template === 'magazine' && result.referencia && (
                          <div className="pt-8 flex justify-end">
                            <p className="text-[10px] font-black font-premium-sans text-ai-primary uppercase tracking-[0.5em] border-b border-ai-primary/30 pb-1">
                              {result.referencia}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[#0D0D0E] flex flex-col items-center justify-center gap-4 text-gray-700">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando Tema</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleGenerateImage(result.prompt)}
                  disabled={generatingImage}
                  className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingImage ? 'animate-spin' : ''}`} />
                  Novo Visual
                </button>
                <button className="px-6 py-3 rounded-2xl bg-ai-primary text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-ai-primary/20">
                  <Download className="w-4 h-4" />
                  Baixar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoCard({ icon, label, content }: any) {
  return (
    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-5 group hover:border-white/10 transition-colors">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-gray-500 group-hover:text-ai-primary transition-colors shrink-0">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
        <div className="text-sm text-gray-300 leading-relaxed">{content}</div>
      </div>
    </div>
  );
}
