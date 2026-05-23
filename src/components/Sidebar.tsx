import { Home, Video, Settings, X, Quote, Lightbulb, Images, CalendarClock, Youtube, Plus, Trash2 } from 'lucide-react';
import { AppStep } from '../types';
import type { YouTubeAccount, InstagramAccount } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface SidebarProps {
  currentStep: AppStep;
  onNavigateHome: () => void;
  onNavigateProjects: () => void;
  onNavigateViralPhrases: () => void;
  onNavigateCuriosityPost: () => void;
  onNavigateCuriosityGallery: () => void;
  onNavigateSchedules: () => void;
  isOpen: boolean;
  onClose: () => void;
  integrationsStatus: { ai: boolean; youtube: boolean; instagram: boolean };
  youtubeAccounts: YouTubeAccount[];
  instagramAccounts: InstagramAccount[];
  onAddYouTubeAccount?: () => void;
  onRemoveYouTubeAccount?: (id: string) => void;
  onAddInstagramAccount?: () => void;
  onRemoveInstagramAccount?: (id: string) => void;
}

export default function Sidebar({
  currentStep, onNavigateHome, onNavigateProjects, onNavigateViralPhrases,
  onNavigateCuriosityPost, onNavigateCuriosityGallery, onNavigateSchedules,
  isOpen, onClose, integrationsStatus, youtubeAccounts, instagramAccounts,
  onAddYouTubeAccount, onRemoveYouTubeAccount, onAddInstagramAccount, onRemoveInstagramAccount
}: SidebarProps) {
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
          <span className="font-display font-bold text-xl tracking-tight text-white">Mood<span className="text-[#00E5FF]">clip</span></span>
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
          <NavItem icon={<CalendarClock className="w-4.5 h-4.5" />} label="Agendamentos" isActive={currentStep === AppStep.SCHEDULES} onClick={() => handleNav(onNavigateSchedules)} />
          <NavItem icon={<Settings className="w-4.5 h-4.5" />} label="Configurações" isActive={false} />
        </nav>

        <div className="px-3 mt-auto">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Conexões</h4>

            <div className="space-y-4">
              {/* YouTube — múltiplas contas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-gray-500">YouTube</span>
                  </div>
                  <button
                    onClick={onAddYouTubeAccount}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#00E5FF] hover:brightness-110 transition-all"
                    title="Adicionar conta YouTube"
                  >
                    <Plus className="w-3 h-3" />
                    ADICIONAR
                  </button>
                </div>

                {youtubeAccounts.length === 0 ? (
                  <p className="text-[10px] text-gray-600 pl-1">Nenhuma conta conectada</p>
                ) : (
                  <div className="space-y-1.5">
                    {youtubeAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between group/acc">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                          <span className="text-[11px] text-gray-400 truncate">
                            {acc.channel_name ?? 'Canal sem nome'}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveYouTubeAccount?.(acc.id)}
                          className="opacity-0 group-hover/acc:opacity-100 p-1 rounded text-gray-600 hover:text-rose-500 transition-all shrink-0 ml-1"
                          title="Desconectar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div className="border-t border-white/5" />

              {/* Instagram — múltiplas contas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="w-3.5 h-3.5" />
                    <span className="text-xs text-gray-500">Instagram</span>
                  </div>
                  <button
                    onClick={onAddInstagramAccount}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#00E5FF] hover:brightness-110 transition-all"
                    title="Adicionar conta Instagram"
                  >
                    <Plus className="w-3 h-3" />
                    ADICIONAR
                  </button>
                </div>

                {instagramAccounts.length === 0 ? (
                  <p className="text-[10px] text-gray-600 pl-1">Nenhuma conta conectada</p>
                ) : (
                  <div className="space-y-1.5">
                    {instagramAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between group/acc">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                          <span className="text-[11px] text-gray-400 truncate">
                            {acc.username ? `@${acc.username}` : 'Conta sem nome'}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveInstagramAccount?.(acc.id)}
                          className="opacity-0 group-hover/acc:opacity-100 p-1 rounded text-gray-600 hover:text-rose-500 transition-all shrink-0 ml-1"
                          title="Desconectar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
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

function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" stroke="none" />
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
