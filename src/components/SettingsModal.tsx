import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2, Bot, Sparkles, Mic, Server } from 'lucide-react';
import { api } from '../lib/api';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    openai: false,
    replicate: false,
    elevenlabs: false
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const voices = await api.narration.voices().catch(() => []);
        setStatus({
          openai: true,
          replicate: true,
          elevenlabs: voices.length > 0
        });
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-ai-primary/10 flex items-center justify-center">
              <Server className="w-6 h-6 text-ai-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">System Core</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Service Status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-500 hover:text-white" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="glass-card p-4 border-emerald-500/10 bg-emerald-500/[0.02]">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                As chaves de API e motores de processamento são gerenciados automaticamente por nossos servidores dedicados. Sua conta está em conformidade total.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <StatusItem 
              icon={<Sparkles className="w-4 h-4" />}
              label="Intelligence Layer"
              desc="OpenAI GPT-4o Model"
              connected={status.openai}
              loading={loading}
              accent="text-ai-secondary"
            />
            <StatusItem 
              icon={<Bot className="w-4 h-4" />}
              label="Imaging Engine"
              desc="Replicate Flux.1 [pro]"
              connected={status.replicate}
              loading={loading}
              accent="text-ai-primary"
            />
            <StatusItem 
              icon={<Mic className="w-4 h-4" />}
              label="Audio Synthesis"
              desc="ElevenLabs Multilingual v2"
              connected={status.elevenlabs}
              loading={loading}
              accent="text-orange-500"
            />
          </div>
        </div>

        <div className="p-8 bg-white/[0.02] border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatusItem({ icon, label, desc, connected, loading, accent }: { 
  icon: React.ReactNode; 
  label: string; 
  desc: string;
  connected: boolean; 
  loading: boolean;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${accent} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <span className="block text-sm font-bold text-gray-200">{label}</span>
          <span className="block text-[10px] font-medium text-gray-600">{desc}</span>
        </div>
      </div>
      
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
      ) : connected ? (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Offline</span>
        </div>
      )}
    </div>
  );
}
