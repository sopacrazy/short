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
    <div className="min-h-screen bg-[#050506] flex overflow-hidden font-sans">
      {/* Lado Esquerdo: Imagem e Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A0B]">
        {/* Background Image com Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/login-bg.png" 
            className="w-full h-full object-cover opacity-60 scale-105"
            alt="AI Video Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 z-10" />
        </div>

        {/* Conteúdo flutuante à esquerda */}
        <div className="relative z-20 w-full h-full p-16 flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-ai-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">Clipaai</span>
          </div>

          <div className="max-w-md space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl font-display font-bold text-white leading-tight">
                Crie vídeos virais com o poder da <span className="text-ai-primary">IA</span>.
              </h1>
              <p className="mt-6 text-xl text-gray-400 font-medium leading-relaxed">
                A próxima geração de produção de conteúdo automatizado. Roteiro, narração e edição em segundos.
              </p>
            </motion.div>

            <div className="pt-8 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <img
                      key={i}
                      src={`https://i.pravatar.cc/100?img=${i + 10}`}
                      className="w-10 h-10 rounded-full border-2 border-[#050506] bg-gray-900 object-cover"
                      alt={`Usuário ${i}`}
                    />
                  ))}
                </div>
                <div className="text-sm">
                  <p className="text-white font-bold">+2.000 Criadores</p>
                  <p className="text-gray-500 font-medium">Já estão dominando os Shorts.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 font-medium">
            © 2026 Clipaai Inc. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative bg-[#050506]">
        {/* Glow sutil de fundo para mobile */}
        <div className="lg:hidden absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-ai-primary/10 rounded-full blur-[120px]" />
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[420px] relative z-10 space-y-10"
        >
          <div className="lg:hidden text-center mb-10">
            <Sparkles className="w-12 h-12 text-ai-primary mx-auto mb-4" />
            <h1 className="text-3xl font-display font-bold text-white">Clipaai</h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-gray-500 font-medium">
              {isLogin ? 'Entre para gerenciar seus vídeos cinematográficos.' : 'Comece sua jornada na produção automatizada hoje.'}
            </p>
          </div>

          {/* Tab Switcher - Nucleus Style */}
          <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-500 hover:text-white'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-500 hover:text-white'}`}
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">E-mail corporativo</label>
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
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Senha de acesso</label>
                  {isLogin && <button type="button" className="text-[10px] font-bold text-ai-primary/60 hover:text-ai-primary uppercase tracking-widest transition-colors">Esqueci a senha</button>}
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
              className="w-full group relative flex items-center justify-center gap-3 py-4.5 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-100 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-2xl shadow-white/5"
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

          <div className="space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <span className="relative px-4 text-[10px] font-bold text-gray-600 bg-[#050506] uppercase tracking-[0.2em]">Ou continue com</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 hover:border-white/20 transition-all">
                <Github className="w-4 h-4" />
                GitHub
              </button>
              <button className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 hover:border-white/20 transition-all">
                <Chrome className="w-4 h-4" />
                Google
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-[10px] font-medium leading-relaxed">
            Ao continuar, você aceita nossos <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-4">Termos</span> e <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-4">Política de Privacidade</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
