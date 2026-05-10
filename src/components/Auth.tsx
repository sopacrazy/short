import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, Rocket, ArrowRight, Github } from 'lucide-react';
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
    <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7B61FF]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00E5FF]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-[#00E5FF] mb-4 shadow-lg shadow-[#7B61FF]/20">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Clipai</h1>
          <p className="text-gray-400">Transforme suas ideias em vídeos virais com IA</p>
        </div>

        <div className="bg-[#141415]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-black/40 p-1 rounded-xl mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#7B61FF]/40 transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#7B61FF]/40 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full group relative flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#6B51EF] text-white font-bold transition-all hover:opacity-90 disabled:opacity-50 overflow-hidden shadow-lg shadow-[#7B61FF]/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar Agora' : 'Começar Gratuitamente'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <span className="relative px-3 text-xs text-gray-600 bg-[#141415] uppercase tracking-widest font-medium">Ou continue com</span>
            </div>
            
            <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/5 text-white font-medium hover:bg-white/10 transition-all">
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-gray-600 text-xs">
          Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
}
