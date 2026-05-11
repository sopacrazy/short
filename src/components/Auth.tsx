import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, Sparkles, ArrowRight, Github, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onSession: () => void;
}

export default function Auth({ onSession }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (authError) throw authError;
      onSession();
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100" />
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
          }} 
        />
        
        {/* Dynamic Glows */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7B61FF] rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00E5FF] rounded-full blur-[160px]" 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-[#141415] border border-white/5 mb-6 relative group"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#7B61FF] to-[#00E5FF] opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
            <Sparkles className="w-10 h-10 text-ai-primary relative z-10" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight mb-2">AstraShorts</h1>
          <p className="text-gray-500 font-medium text-sm">Próxima geração de produção de conteúdo.</p>
        </div>

        {/* Auth Card */}
        <div className="relative group">
          {/* Edge highlight effect */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[2.5rem] opacity-100 group-hover:from-[#7B61FF]/40 transition-all duration-500" />
          
          <div className="relative bg-[#0A0A0B]/80 backdrop-blur-[40px] rounded-[2.5rem] p-10 shadow-2xl border border-white/[0.03]">
            {/* Tab Switcher */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl mb-10 border border-white/[0.02]">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                Registrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs font-bold text-rose-500 flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-ai-primary transition-colors" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-ai-primary/40 focus:bg-white/[0.04] transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Senha</label>
                    {isLogin && <button type="button" className="text-[10px] font-bold text-ai-primary/60 hover:text-ai-primary uppercase tracking-widest">Esqueci a senha</button>}
                  </div>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-ai-primary transition-colors" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-ai-primary/40 focus:bg-white/[0.04] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-white/5"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Entrar na Plataforma' : 'Criar minha Conta'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <span className="relative px-4 text-[10px] font-bold text-gray-600 bg-[#0A0A0B] uppercase tracking-[0.2em]">Conexão Segura</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 transition-all">
                  <Github className="w-4 h-4" />
                  GitHub
                </button>
                <button className="flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 transition-all">
                  <Chrome className="w-4 h-4" />
                  Google
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-gray-600 text-[10px] font-medium leading-relaxed max-w-xs mx-auto">
          Ao continuar, você aceita nossos <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-4">Termos</span> e <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-4">Política de Privacidade</span>.
        </p>
      </motion.div>
    </div>
  );
}
