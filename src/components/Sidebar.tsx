import { Home, Video, Settings, X, CheckCircle2, XCircle, Quote, Lightbulb, Images } from 'lucide-react';
import { AppStep } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface SidebarProps {
  currentStep: AppStep;
  onNavigateHome: () => void;
  onNavigateProjects: () => void;
  onNavigateViralPhrases: () => void;
  onNavigateCuriosityPost: () => void;
  onNavigateCuriosityGallery: () => void;
  isOpen: boolean;
  onClose: () => void;
  integrationsStatus: { ai: boolean; youtube: boolean; instagram: boolean };
}

export default function Sidebar({ currentStep, onNavigateHome, onNavigateProjects, onNavigateViralPhrases, onNavigateCuriosityPost, onNavigateCuriosityGallery, isOpen, onClose, integrationsStatus }: SidebarProps) {
  const handleNav = (fn?: () => void) => {
    fn?.();
    onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#0D0D0E]
        flex flex-col py-8 shrink-0 transition-transform duration-300
        lg:relative lg:translate-x-0 lg:z-10
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Botão fechar — só mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-gray-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 mb-10 flex items-center gap-3">
          <ClipaaiLogo className="w-10 h-10" />
          <span className="font-display font-bold text-xl tracking-tight text-white">Clipa<span className="text-[#00E5FF]">ai</span></span>
        </div>

        <nav className="flex-1 w-full px-3 space-y-1">
          <NavItem icon={<Home className="w-4.5 h-4.5" />} label="Início" isActive={currentStep === AppStep.DASHBOARD} onClick={() => handleNav(onNavigateHome)} />
          <NavItem icon={<Video className="w-4.5 h-4.5" />} label="Projetos" isActive={currentStep === AppStep.PROJECTS} onClick={() => handleNav(onNavigateProjects)} />

          <div className="pt-8 pb-2 px-4">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ferramentas</span>
          </div>
          <NavItem icon={<Quote className="w-4.5 h-4.5" />} label="Post de Frases" isActive={currentStep === AppStep.VIRAL_PHRASES} onClick={() => handleNav(onNavigateViralPhrases)} />
          <NavItem icon={<Lightbulb className="w-4.5 h-4.5" />} label="Post de Curiosidades" isActive={currentStep === AppStep.CURIOSITY_POST} onClick={() => handleNav(onNavigateCuriosityPost)} />
          <NavItem icon={<Images className="w-4.5 h-4.5" />} label="Galeria de Posts" isActive={currentStep === AppStep.CURIOSITY_GALLERY} onClick={() => handleNav(onNavigateCuriosityGallery)} />
          <NavItem icon={<Settings className="w-4.5 h-4.5" />} label="Configurações" isActive={false} />
        </nav>

        <div className="px-3 mt-auto">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Conexões</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between group/status">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${integrationsStatus.youtube ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                  <span className="text-xs text-gray-500 group-hover/status:text-gray-300 transition-colors">YouTube</span>
                </div>
                {!integrationsStatus.youtube && (
                  <button className="text-[10px] font-bold text-[#00E5FF] hover:brightness-110 transition-all">CONECTAR</button>
                )}
              </div>

              <div className="flex items-center justify-between group/status">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${integrationsStatus.instagram ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                  <span className="text-xs text-gray-500 group-hover/status:text-gray-300 transition-colors">Instagram</span>
                </div>
                {!integrationsStatus.instagram && (
                  <button className="text-[10px] font-bold text-[#00E5FF] hover:brightness-110 transition-all">CONECTAR</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ClipaaiLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clipaai-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E5FF" />
          <stop offset="1" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="10" width="36" height="24" rx="4" fill="url(#clipaai-grad)" />
      <rect x="2" y="10" width="36" height="7" rx="4" fill="rgba(0,0,0,0.35)" />
      <clipPath id="cp-top">
        <rect x="2" y="10" width="36" height="7" rx="4" />
      </clipPath>
      <g clipPath="url(#cp-top)" opacity="0.5">
        <path d="M8 10 L14 17 L8 17Z" fill="white" />
        <path d="M16 10 L22 17 L16 17Z" fill="white" />
        <path d="M24 10 L30 17 L24 17Z" fill="white" />
        <path d="M32 10 L38 17 L32 17Z" fill="white" />
      </g>
      <path d="M16 22 L27 28 L16 34Z" fill="white" />
    </svg>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium relative group ${
        isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'
      }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-300'} transition-colors`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
