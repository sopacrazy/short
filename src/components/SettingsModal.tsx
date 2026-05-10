import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Save, Loader2, Info, Eye, EyeOff, Bot, Sparkles, Mic } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keys, setKeys] = useState({
    openai_key: '',
    replicate_token: '',
    elevenlabs_key: ''
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    replicate: false,
    elevenlabs: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setKeys({
          openai_key: data.openai_key || '',
          replicate_token: data.replicate_token || '',
          elevenlabs_key: data.elevenlabs_key || ''
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...keys,
        updated_at: new Date().toISOString()
      });

    if (error) alert('Erro ao salvar: ' + error.message);
    else onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#141415] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B61FF]/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-[#7B61FF]" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-white">Configurações de IA</h2>
              <p className="text-xs text-gray-500">Suas chaves privadas de processamento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400/80 leading-relaxed">
              Você precisa configurar suas próprias chaves de API para usar o AstraShorts. Sem elas, não será possível gerar roteiros, imagens ou narrações.
            </p>
          </div>

          <div className="space-y-4">
            {/* OpenAI */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#7B61FF]" />
                <label className="text-sm font-medium text-gray-300">OpenAI API Key (GPT-4o)</label>
              </div>
              <div className="relative">
                <input
                  type={showKeys.openai ? "text" : "password"}
                  value={keys.openai_key}
                  onChange={e => setKeys({ ...keys, openai_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#7B61FF]/40"
                />
                <button 
                  onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Replicate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-[#00E5FF]" />
                <label className="text-sm font-medium text-gray-300">Replicate API Token (Flux)</label>
              </div>
              <div className="relative">
                <input
                  type={showKeys.replicate ? "text" : "password"}
                  value={keys.replicate_token}
                  onChange={e => setKeys({ ...keys, replicate_token: e.target.value })}
                  placeholder="r8_..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#00E5FF]/40"
                />
                <button 
                  onClick={() => setShowKeys({ ...showKeys, replicate: !showKeys.replicate })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  {showKeys.replicate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* ElevenLabs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="w-4 h-4 text-orange-400" />
                <label className="text-sm font-medium text-gray-300">ElevenLabs API Key (TTS)</label>
              </div>
              <div className="relative">
                <input
                  type={showKeys.elevenlabs ? "text" : "password"}
                  value={keys.elevenlabs_key}
                  onChange={e => setKeys({ ...keys, elevenlabs_key: e.target.value })}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-400/40"
                />
                <button 
                  onClick={() => setShowKeys({ ...showKeys, elevenlabs: !showKeys.elevenlabs })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  {showKeys.elevenlabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-3 px-4 rounded-xl bg-[#7B61FF] hover:bg-[#6B51EF] text-white font-bold transition-all shadow-lg shadow-[#7B61FF]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Chaves
          </button>
        </div>
      </motion.div>
    </div>
  );
}
