import { useState, useEffect } from 'react';
import { Menu, Settings, LogOut, User, Loader2 } from 'lucide-react';
import { AppStep, type ProjectContext } from './types';
import type { ApiProject } from './lib/api';
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
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pendingFolderDefaults, setPendingFolderDefaults] = useState<FolderDefaults | null>(null);
  const [integrationsStatus, setIntegrationsStatus] = useState({ ai: false, youtube: false });

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

  const checkIntegrations = async () => {
    try {
      const [voices, yt] = await Promise.all([
        api.narration.voices().catch(() => []),
        api.youtube.status().catch(() => ({ connected: false })),
      ]);
      setIntegrationsStatus({
        ai: voices.length > 0,
        youtube: yt.connected,
      });
    } catch (err) {
      console.error('Error checking integrations:', err);
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

  const handleTopicDone = (ctx: ProjectContext) => {
    const defaults = pendingFolderDefaults;
    setProject({ ...ctx, ...defaults ?? {} });
    setPendingFolderDefaults(null);
    if (defaults?.folderId) {
      api.projects.moveToFolder(ctx.projectId, defaults.folderId).catch(() => {});
    }
    setCurrentStep(AppStep.SCRIPT_GENERATION);
  };

  const handleAutoGenerate = (ctx: ProjectContext) => {
    const defaults = pendingFolderDefaults;
    setProject({ ...ctx, ...defaults ?? {} });
    setPendingFolderDefaults(null);
    if (defaults?.folderId) {
      api.projects.moveToFolder(ctx.projectId, defaults.folderId).catch(() => {});
    }
    setCurrentStep(AppStep.AUTO_GENERATION);
  };

  // Abre projeto existente direto na etapa de imagens para edição
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

  if (authLoading) return null;

  if (!session) return <Auth onSession={() => {}} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ai-dark text-white selection:bg-ai-primary/30">
      <Sidebar
        currentStep={currentStep}
        onNavigateHome={goToDashboard}
        onNavigateProjects={goToProjects}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        integrationsStatus={integrationsStatus}
      />

      <main className="flex-1 relative overflow-y-auto flex flex-col">
        {/* Topbar desktop/mobile */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#ffffff0a] bg-[#141415]/80 backdrop-blur sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <svg className="w-7 h-7" viewBox="0 0 40 40" fill="none">
                <defs>
                  <linearGradient id="m-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00E5FF" /><stop offset="1" stopColor="#7B61FF" />
                  </linearGradient>
                </defs>
                <rect x="2" y="10" width="36" height="24" rx="4" fill="url(#m-grad)" />
                <rect x="2" y="10" width="36" height="7" rx="4" fill="rgba(0,0,0,0.35)" />
                <clipPath id="m-cp"><rect x="2" y="10" width="36" height="7" rx="4" /></clipPath>
                <g clipPath="url(#m-cp)" opacity="0.5">
                  <path d="M8 10 L14 17 L8 17Z" fill="white" />
                  <path d="M16 10 L22 17 L16 17Z" fill="white" />
                  <path d="M24 10 L30 17 L24 17Z" fill="white" />
                  <path d="M32 10 L38 17 L32 17Z" fill="white" />
                </g>
                <path d="M16 22 L27 28 L16 34Z" fill="white" />
              </svg>
              <span className="font-display font-semibold text-lg hidden sm:inline">Clip<span className="text-[#00E5FF]">ai</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-medium text-white">{session.user.email?.split('@')[0]}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Plano Pro</span>
            </div>
            <div className="relative group">
              <button className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7B61FF] to-[#00E5FF] p-[2px]">
                <div className="w-full h-full rounded-full bg-[#141415] flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-56 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
                <div className="bg-[#1A1A1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2">
                  <div className="px-3 py-2 mb-2 border-b border-white/5">
                    <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                  </div>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-300 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações de IA
                  </button>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-sm text-rose-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        <div className="flex-1 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-ai-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-12 min-h-full">
          {currentStep === AppStep.DASHBOARD && (
            <Dashboard onStartProject={startNewProject} onEditProject={handleEditProject} onExportProject={handleExportProject} />
          )}

          {currentStep === AppStep.PROJECTS && (
            <ProjectsView onStartProject={startNewProject} onEditProject={handleEditProject} onExportProject={handleExportProject} />
          )}

          {currentStep === AppStep.TOPIC_SELECTION && (
            <Step1Topic onNext={handleTopicDone} onAutoGenerate={handleAutoGenerate} folderContext={pendingFolderDefaults ?? undefined} />
          )}

          {currentStep === AppStep.AUTO_GENERATION && project && (
            <AutoGeneration
              project={project}
              onComplete={() => setCurrentStep(AppStep.EXPORT)}
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
      </main>
    </div>
  );
}
