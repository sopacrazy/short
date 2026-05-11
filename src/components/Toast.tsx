import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-rose-400" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const STYLES = {
  success: 'border-emerald-500/20 bg-emerald-500/5',
  error: 'border-rose-500/20 bg-rose-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl
        min-w-[300px] max-w-md ${STYLES[type]}
      `}
    >
      <div className="shrink-0">{ICONS[type]}</div>
      <p className="flex-1 text-sm font-medium text-gray-200">{message}</p>
      <button 
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
