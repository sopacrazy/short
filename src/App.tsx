import { useState, useEffect, useRef } from 'react';
import { Menu, Settings, LogOut, Bell, HelpCircle, Sparkles } from 'lucide-react';
import { AppStep, type ProjectContext } from './types';
import type { ApiProject, YouTubeAccount, InstagramAccount } from './lib/api';
import { api } from './lib/api';
import type { FolderDefaults } from './types';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectsView from './components/ProjectsView';
import Step1Topic from './components/Step1Topic';
import Step2Script from './components/Step2Script';
import Step3Production from './components/Step3Production';
import Step4Preview from './components/Step4Preview';
import Step5Export from './components/Step5Export';
import AutoGeneration from './components/AutoGeneration';
import Auth from './components/Auth';
import ViralPhrases from './components/ViralPhrases';
import CuriosityPost from './components/CuriosityPost';
import CuriosityGallery from './components/CuriosityGallery';
import Agendamentos from './components/Agendamentos';
import SettingsModal from './components/SettingsModal';
import Toast, { type ToastType } from './components/Toast';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  message: string;
  type: ToastType;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [pendingFolderDefaults, setPendingFolderDefaults] = useState<FolderDefaults | null>(null);
  const [integrationsStatus, setIntegrationsStatus] = useState({ ai: false, youtube: false, instagram: false });
  const [youtubeAccounts, setYoutubeAccounts] = useState<YouTubeAccount[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);

  // Evita re-checar integrações a cada evento onAuthStateChange (token refresh, etc.)
  const _lastIntegrationCheck = useRef(0);
  const INTEGRATION_TTL = 2 * 60 * 1000; // 2 minutos

  const notify = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) checkIntegrations();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkIntegrations();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIntegrations = async (force = false) => {
    const now = Date.now();
    if (!force && now - _lastIntegrationCheck.current < INTEGRATION_TTL) return;
    _lastIntegrationCheck.current = now;
    try {
      const [voices, ytAccounts, igAccounts] = await Promise.all([
        api.narration.voices(),
        api.youtube.accounts(),
        api.instagram.accounts(),
      ]);
      setYoutubeAccounts(ytAccounts);
      setInstagramAccounts(igAccounts);
      setIntegrationsStatus({
        ai: voices.length > 0,
        youtube: ytAccounts.length > 0,
        instagram: igAccounts.length > 0,
      });
    } catch (err) {
      console.error('Erro ao checar integrações:', err);
      // Não desloga — erro de rede não deve encerrar a sessão
    }
  };

  const handleAddYouTubeAccount = async () => {
    try {
      const { url } = await api.youtube.getAuthUrl();
      const popup = window.open(url, 'youtube_oauth', 'width=500,height=650,left=400,top=100');
      const handler = (e: MessageEvent) => {
        if (e.data === 'youtube_connected') {
          window.removeEventListener('message', handler);
          popup?.close();
          checkIntegrations(true);
          notify('Conta YouTube adicionada com sucesso!', 'success');
        }
      };
      window.addEventListener('message', handler);
    } catch {
      notify('Erro ao iniciar conexão com YouTube', 'error');
    }
  };

  const handleRemoveYouTubeAccount = async (id: string) => {
    try {
      await api.youtube.removeAccount(id);
      setYoutubeAccounts(prev => prev.filter(a => a.id !== id));
      setIntegrationsStatus(prev => ({ ...prev, youtube: youtubeAccounts.length > 1 }));
      notify('Conta YouTube removida.', 'info');
    } catch {
      notify('Erro ao remover conta YouTube', 'error');
    }
  };

  const handleAddInstagramAccount = async () => {
    try {
      const { url } = await api.instagram.getAuthUrl();
      const popup = window.open(url, 'instagram_oauth', 'width=500,height=750,left=400,top=100');
      const handler = (e: MessageEvent) => {
        if (e.data === 'instagram_connected' || e.data === 'instagram_error') {
          window.removeEventListener('message', handler);
          popup?.close();
          if (e.data === 'instagram_connected') {
            api.instagram.accounts()
              .then(accs => {
                setInstagramAccounts(accs);
                setIntegrationsStatus(prev => ({ ...prev, instagram: accs.length > 0 }));
              })
              .catch(() => checkIntegrations(true));
            notify('Conta Instagram adicionada com sucesso!', 'success');
          } else {
            notify('Erro ao conectar Instagram. Verifique se sua conta tem perfil Business/Creator.', 'error');
          }
        }
      };
      window.addEventListener('message', handler);
    } catch {
      notify('Erro ao iniciar conexão com Instagram', 'error');
    }
  };

  const handleRemoveInstagramAccount = async (id: string) => {
    try {
      await api.instagram.removeAccount(id);
      setInstagramAccounts(prev => prev.filter(a => a.id !== id));
      setIntegrationsStatus(prev => ({ ...prev, instagram: instagramAccounts.length > 1 }));
      notify('Conta Instagram removida.', 'info');
    } catch {
      notify('Erro ao remover conta Instagram', 'error');
    }
  };

  const startNewProject = (defaults?: FolderDefaults) => {
    setProject(null);
    setPendingFolderDefaults(defaults ?? null);
    setCurrentStep(AppStep.TOPIC_SELECTION);
  };

  const goToDashboard = () => {
    setProject(null);
    setCurrentStep(AppStep.DASHBOARD);
  };

  const goToProjects = () => {
    setProject(null);
    setCurrentStep(AppStep.PROJECTS);
  };

  const goToViralPhrases = () => {
    setProject(null);
    setCurrentStep(AppStep.VIRAL_PHRASES);
  };

  const goToCuriosityPost = () => {
    setProject(null);
    setCurrentStep(AppStep.CURIOSITY_POST);
  };

  const goToCuriosityGallery = () => {
    setProject(null);
    setCurrentStep(AppStep.CURIOSITY_GALLERY);
  };

  const goToSchedules = () => {
    setProject(null);
    setCurrentStep(AppStep.SCHEDULES);
  };

  const handleTopicDone = (ctx: ProjectContext) => {
    const defaults = pendingFolderDefaults;
    setProject({ ...ctx, ...defaults ?? {} });
    setPendingFolderDefaults(null);
    if (defaults?.folderId) {
      api.projects.moveToFolder(ctx.projectId, defaults.folderId).catch(() => {});
    }
    setCurrentStep(AppStep.SCRIPT_GENERATION);
    notify('Projeto iniciado com sucesso!', 'success');
  };

  const handleAutoGenerate = (ctx: ProjectContext) => {
    const defaults = pendingFolderDefaults;
    setProject({ ...ctx, ...defaults ?? {} });
    setPendingFolderDefaults(null);
    if (defaults?.folderId) {
      api.projects.moveToFolder(ctx.projectId, defaults.folderId).catch(() => {});
    }
    setCurrentStep(AppStep.AUTO_GENERATION);
    notify('Iniciando geração automática...', 'info');
  };

  const handleEditProject = async (p: ApiProject) => {
    const base: ProjectContext = { projectId: p.id, topic: p.topic, niche: p.niche ?? 'curiosidades' };
    await loadProjectContext(p, base);
    setCurrentStep(AppStep.PRODUCTION_ELEMENTS);
  };

  const handleExportProject = async (p: ApiProject) => {
    const base: ProjectContext = { projectId: p.id, topic: p.topic, niche: p.niche ?? 'curiosidades' };
    await loadProjectContext(p, base);
    setCurrentStep(AppStep.EXPORT);
  };

  const loadProjectContext = async (p: ApiProject, base: ProjectContext) => {
    if (p.folder_id) {
      try {
        const [folder, voices] = await Promise.all([
          api.folders.get(p.folder_id),
          api.narration.voices().catch(() => []),
        ]);
        const voiceName = folder.default_voice_id
          ? voices.find(v => v.voice_id === folder.default_voice_id)?.name
          : undefined;
        setProject({
          ...base,
          folderId: folder.id,
          folderName: folder.name,
          folderEmoji: folder.emoji,
          defaultVoiceId: folder.default_voice_id ?? undefined,
          defaultVoiceName: voiceName,
          defaultLanguage: folder.default_language ?? 'pt',
        });
      } catch {
        setProject(base);
      }
    } else {
      setProject(base);
    }
  };

  if (authLoading) return (
    <div className="flex h-screen w-full items-center justify-center bg-ai-dark">
      <div className="flex flex-col items-center gap-4">
        <Sparkles className="w-10 h-10 text-ai-primary animate-pulse" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 animate-pulse">Carregando...</p>
      </div>
    </div>
  );

  if (!session) return <Auth onSession={() => {}} />;

  const STEP_TITLES: Record<AppStep, string> = {
    [AppStep.DASHBOARD]: 'Início',
    [AppStep.PROJECTS]: 'Meus Projetos',
    [AppStep.TOPIC_SELECTION]: 'Novo Projeto',
    [AppStep.SCRIPT_GENERATION]: 'Roteiro',
    [AppStep.AUTO_GENERATION]: 'Geração Automática',
    [AppStep.PRODUCTION_ELEMENTS]: 'Produção',
    [AppStep.PREVIEW]: 'Preview',
    [AppStep.EXPORT]: 'Exportar',
    [AppStep.VIRAL_PHRASES]: 'Post de Frases',
    [AppStep.CURIOSITY_POST]: 'Post de Curiosidades',
    [AppStep.CURIOSITY_GALLERY]: 'Galeria de Posts',
    [AppStep.SCHEDULES]: 'Agendamentos',
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ai-dark text-white selection:bg-ai-primary/30">
      <Sidebar
        currentStep={currentStep}
        onNavigateHome={goToDashboard}
        onNavigateProjects={goToProjects}
        onNavigateViralPhrases={goToViralPhrases}
        onNavigateCuriosityPost={goToCuriosityPost}
        onNavigateCuriosityGallery={goToCuriosityGallery}
        onNavigateSchedules={goToSchedules}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        integrationsStatus={integrationsStatus}
        youtubeAccounts={youtubeAccounts}
        instagramAccounts={instagramAccounts}
        onAddYouTubeAccount={handleAddYouTubeAccount}
        onRemoveYouTubeAccount={handleRemoveYouTubeAccount}
        onAddInstagramAccount={handleAddInstagramAccount}
        onRemoveInstagramAccount={handleRemoveInstagramAccount}
      />

      <main className="flex-1 relative overflow-y-auto flex flex-col">
        {/* Topbar Minimalista ElevenLabs */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-ai-dark/50 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-semibold text-lg text-gray-200">
              {STEP_TITLES[currentStep]}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1">
              <HeaderAction icon={<Bell className="w-4 h-4" />} label="Notificações" />
              <HeaderAction icon={<HelpCircle className="w-4 h-4" />} label="Ajuda" />
            </div>
            
            <div className="w-px h-4 bg-white/10 mx-2 hidden md:block" />

            <div className="relative group">
              <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all">
                <span className="text-xs font-medium text-gray-400 px-2 hidden sm:block">{session.user.email?.split('@')[0]}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ai-primary to-ai-secondary flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-lg shadow-ai-primary/20">
                  {session.user.email?.charAt(0)}
                </div>
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-56 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
                <div className="bg-[#141415] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2">
                  <div className="px-4 py-3 mb-2 border-b border-white/5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Usuário</p>
                    <p className="text-xs text-gray-300 truncate font-medium">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-sm text-rose-500 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        <div className="flex-1 relative">
          {/* Subtle background gradient */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-ai-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto min-h-full">
            {currentStep === AppStep.DASHBOARD && (
              <Dashboard onStartProject={startNewProject} onEditProject={handleEditProject} onExportProject={handleExportProject} />
            )}

            {currentStep === AppStep.PROJECTS && <ProjectsView onStartProject={startNewProject} onEditProject={handleEditProject} onExportProject={handleExportProject} youtubeAccounts={youtubeAccounts} />}
            
            {currentStep === AppStep.VIRAL_PHRASES && <ViralPhrases />}

            {currentStep === AppStep.CURIOSITY_POST && <CuriosityPost />}

            {currentStep === AppStep.CURIOSITY_GALLERY && <CuriosityGallery />}

            {currentStep === AppStep.SCHEDULES && <Agendamentos />}

            {currentStep === AppStep.TOPIC_SELECTION && (
              <Step1Topic onNext={handleTopicDone} onAutoGenerate={handleAutoGenerate} folderContext={pendingFolderDefaults ?? undefined} />
            )}

            {currentStep === AppStep.AUTO_GENERATION && project && (
              <AutoGeneration
                project={project}
                onComplete={() => { setCurrentStep(AppStep.EXPORT); notify('Geração concluída!', 'success'); }}
                onBack={goToDashboard}
              />
            )}

            {currentStep === AppStep.SCRIPT_GENERATION && project && (
              <Step2Script
                project={project}
                onNext={() => setCurrentStep(AppStep.PRODUCTION_ELEMENTS)}
                onBack={() => setCurrentStep(AppStep.TOPIC_SELECTION)}
              />
            )}

            {currentStep === AppStep.PRODUCTION_ELEMENTS && project && (
              <Step3Production
                project={project}
                onNext={() => setCurrentStep(AppStep.PREVIEW)}
                onBack={() => setCurrentStep(AppStep.SCRIPT_GENERATION)}
              />
            )}

            {currentStep === AppStep.PREVIEW && project && (
              <Step4Preview
                project={project}
                onNext={() => setCurrentStep(AppStep.EXPORT)}
                onBack={() => setCurrentStep(AppStep.PRODUCTION_ELEMENTS)}
              />
            )}

            {currentStep === AppStep.EXPORT && project && (
              <Step5Export
                project={project}
                onFinish={goToDashboard}
                onBack={() => setCurrentStep(AppStep.PREVIEW)}
              />
            )}
          </div>
        </div>

        {/* Global Toasts */}
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] flex flex-col gap-3">
          <AnimatePresence>
            {notifications.map(n => (
              <Toast key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function HeaderAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-all text-xs font-medium" title={label}>
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
