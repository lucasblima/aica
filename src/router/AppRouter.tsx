import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { handleOAuthCallback } from '../services/googleAuthService';
import { getAssociations, getDailyAgenda, getLifeAreas, createAssociation, getModuleTasks } from '../services/supabaseService';
import { generateMissingDailyReports } from '../services/dailyReportService';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationContainer, LoadingScreen, BottomNav, CeramicLoadingState } from '../components';
import { ErrorBoundary, ModuleErrorFallback } from '../components/ui/ErrorBoundary';
import { pageTransitionVariants } from '@/lib/animations/ceramic-motion';
import { ViewState } from '../../types';
import { useNavigation } from '../contexts/NavigationContext';
import { StudioProvider } from '../modules/studio/context/StudioContext';
import { FluxProvider } from '../modules/flux/context/FluxContext';
import { EraforgeGameProvider } from '../modules/eraforge/contexts/EraforgeGameContext';
import { EraforgeVoiceProvider } from '../modules/eraforge/contexts/EraforgeVoiceContext';
import { useAuth } from '../hooks/useAuth';
import { XPNotificationProvider } from '../contexts/XPNotificationContext';
import { TourProvider } from '../contexts/TourContext';
import { allTours } from '../config/tours';
import { AuthGuard } from '../components/guards/AuthGuard';
import { ActivationGuard } from '../components/guards/ActivationGuard';
import { AicaChatFAB } from '../components/features/AicaChatFAB';
import { AdminGuard } from '../components/guards/AdminGuard';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AppRouter');

// ==================== LAZY LOADED MODULES ====================
// Heavy modules are loaded on-demand to reduce initial bundle size
// This improves First Contentful Paint (FCP) and Time to Interactive (TTI)

// Core Views - Frequently accessed, loaded lazily
const VidaPage = lazy(() => import('../pages/VidaPage'));
const AgendaView = lazy(() => import('../views/AgendaView').then(m => ({ default: m.AgendaView })));

// Journey Module - Self-contained feature
const JourneyFullScreen = lazy(() => import('../modules/journey/views/JourneyFullScreen').then(m => ({ default: m.JourneyFullScreen })));

// Studio Module - Podcast production with FSM architecture
const StudioMainView = lazy(() => import('../modules/studio/views/StudioMainView'));
const ContentCalendarPage = lazy(() => import('../modules/studio/views/ContentCalendarPage'));
const StudioAnalyticsPage = lazy(() => import('../modules/studio/views/StudioAnalyticsPage'));
// Finance Module - Heavy with charts and data processing
const FinanceDashboard = lazy(() => import('../modules/finance/views/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
// Grants Module - Document processing intensive
const GrantsModuleView = lazy(() => import('../modules/grants/views/GrantsModuleView').then(m => ({ default: m.GrantsModuleView })));
const PresentationDemo = lazy(() => import('../modules/grants/components/presentation/PresentationDemo').then(m => ({ default: m.PresentationDemo })));

// Connections Module - Simplified 2-level navigation
const ConnectionsPage = lazy(() => import('../pages/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const SpaceDetailView = lazy(() => import('../modules/connections/views/SpaceDetailView').then(m => ({ default: m.SpaceDetailView })));
const ContactsView = lazy(() => import('../pages/ContactsView').then(m => ({ default: m.ContactsView })));

// Flux Module - Swim training management
const FluxDashboard = lazy(() => import('../modules/flux').then(m => ({ default: m.FluxDashboard })));
const FluxAthleteDetailView = lazy(() => import('../modules/flux').then(m => ({ default: m.AthleteDetailView })));
const FluxCanvasEditorView = lazy(() => import('../modules/flux').then(m => ({ default: m.CanvasEditorView })));
const FluxAlertsView = lazy(() => import('../modules/flux').then(m => ({ default: m.AlertsView })));

// EraForge Module - Historical simulation game for children
const EraForgeMainView = lazy(() => import('../modules/eraforge/views/EraForgeMainView'));
const EraForgeAccessGuard = lazy(() => import('../modules/eraforge/components/EraForgeAccessGuard'));

// Athlete Portal - Read-only training view for athletes
const AthletePortalView = lazy(() => import('../modules/flux/views/AthletePortalView').then(m => ({ default: m.default })));

// Guest Portal - Read-only episode view for podcast guests
const GuestPortalView = lazy(() => import('../modules/studio/views/GuestPortalView').then(m => ({ default: m.default })));

// Platform Contacts - Unified contact management across modules
const ContactsPage = lazy(() => import('../views/ContactsPage').then(m => ({ default: m.default })));

// Flow Module - Intelligent training prescription system (5 screens)
const TemplateLibraryView = lazy(() => import('../modules/flux/views/TemplateLibraryView').then(m => ({ default: m.default })));
const MicrocycleEditorView = lazy(() => import('../modules/flux/views/MicrocycleEditorView').then(m => ({ default: m.default })));
const LevelingEngineView = lazy(() => import('../modules/flux/views/LevelingEngineView').then(m => ({ default: m.default })));
const IntensityCalculatorView = lazy(() => import('../modules/flux/views/IntensityCalculatorView').then(m => ({ default: m.default })));
const CRMCommandCenterView = lazy(() => import('../modules/flux/views/CRMCommandCenterView').then(m => ({ default: m.default })));
const ParQFormView = lazy(() => import('../modules/flux/views/ParQFormView').then(m => ({ default: m.default })));

// Chat Module - Full-page chat experience
const ChatPage = lazy(() => import('../pages/ChatPage'));

// Google Hub Module - Google Calendar integration dashboard
const GoogleHubPage = lazy(() => import('../modules/google-hub').then(m => ({ default: m.GoogleHubPage })));

// Onboarding Module - Only loaded for new users
const LandingPage = lazy(() => import('../modules/onboarding/components/landing').then(m => ({ default: m.default })));
const OnboardingFlow = lazy(() => import('../modules/onboarding').then(m => ({ default: m.OnboardingFlow })));

// Invite System - Public page for invite acceptance
const InviteAcceptPage = lazy(() => import('../pages/InviteAcceptPage').then(m => ({ default: m.InviteAcceptPage })));

// Billing Module - Pricing and subscription management
const PricingPage = lazy(() => import('../modules/billing').then(m => ({ default: m.PricingPage })));
const ManageSubscriptionPage = lazy(() => import('../modules/billing').then(m => ({ default: m.ManageSubscriptionPage })));
const AdminPortalPage = lazy(() => import('../modules/billing').then(m => ({ default: m.AdminPortalPage })));
const AdminCouponsPage = lazy(() => import('../modules/billing').then(m => ({ default: m.AdminCouponsPage })));
const PricingSimulatorPage = lazy(() => import('../modules/billing').then(m => ({ default: m.PricingSimulatorPage })));

// AI Cost Dashboard - Usage and cost monitoring
const AICostDashboard = lazy(() => import('../components/aiCost/AICostDashboard').then(m => ({ default: m.AICostDashboard })));

// Invites Dashboard - Manage sent invites
const InvitesPage = lazy(() => import('../pages/InvitesPage'));

// Module Hub - Coming Soon system (CS-004)
const ModuleHubPage = lazy(() => import('../components/coming-soon/ModuleHubPage').then(m => ({ default: m.ModuleHubPage })));

// Life RPG Module - Entity personas as RPG characters
const LifeRPGMainView = lazy(() => import('../modules/liferpg/views/LifeRPGMainView'));
const LifeRPGDetailView = lazy(() => import('../modules/liferpg/views/LifeRPGDetailView'));

// Analytics/Settings - Rarely accessed
const FileSearchAnalyticsView = lazy(() => import('../components/fileSearch/FileSearchAnalyticsView').then(m => ({ default: m.FileSearchAnalyticsView })));
const DiagnosticsPage = lazy(() => import('../pages/DiagnosticsPage').then(m => ({ default: m.default })));

// Legal Pages - Rarely accessed
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const StatusPage = lazy(() => import('../pages/StatusPage').then(m => ({ default: m.StatusPage })));


const ProfilePage = lazy(() => import('../views/ProfilePage').then(m => ({ default: m.ProfilePage })));

// PWA Share Target - Receives shared files from WhatsApp
const ShareTargetPage = lazy(() => import('../pages/ShareTargetPage').then(m => ({ default: m.ShareTargetPage })));

// Life Area Views - Generic view for health, education, legal, professional modules
const LifeAreaView = lazy(() => import('../views/LifeAreaView').then(m => ({ default: m.LifeAreaView })));

// 404 Not Found
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Legacy redirect for old /connections/:archetype/:spaceId URLs
function LegacySpaceRedirect() {
   const params = useParams<{ spaceId?: string }>();
   return <Navigate to={`/connections/${params.spaceId}`} replace />;
}

// Protected route with auth + invite activation check
function ProtectedRoute({ children }: { children: React.ReactNode }) {
   return <AuthGuard><ActivationGuard>{children}</ActivationGuard></AuthGuard>;
}

// Reusable Module Card Component (for association detail view)
const ModuleCard = ({ moduleId, title, icon: Icon, color, accentColor }: any) => {
   const [tasks, setTasks] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      getModuleTasks(moduleId).then(data => {
         setTasks(data);
         setLoading(false);
      });
   }, [moduleId]);

   return (
      <div className={`ceramic-card relative overflow-hidden p-6 hover:scale-[1.02] transition-transform duration-300 group cursor-pointer`}>
         <Icon className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-5 ${accentColor.split(' ')[2]} group-hover:scale-110 transition-transform duration-500`} />
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <div className="ceramic-inset p-2">
                  <Icon className={`w-5 h-5 ${accentColor.split(' ')[2]}`} />
               </div>
               <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">{title}</span>
            </div>

            <div className="space-y-2">
               {loading ? (
                  <div className="space-y-2 animate-pulse">
                     <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4"></div>
                     <div className="h-4 bg-ceramic-text-secondary/10 rounded w-1/2"></div>
                  </div>
               ) : tasks.length > 0 ? (
                  tasks.map(task => (
                     <div key={task.id} className="flex items-start gap-2 group/task cursor-pointer">
                        <div className={`mt-1.5 w-2 h-2 rounded-full ${accentColor.split(' ')[1]} group-hover/task:scale-125 transition-transform`}></div>
                        <span className="text-xs font-medium text-ceramic-text-primary line-clamp-2 group-hover/task:text-ceramic-text-secondary transition-colors">{task.title}</span>
                     </div>
                  ))
               ) : (
                  <p className="text-xs text-ceramic-text-secondary italic font-light">Nenhuma tarefa pendente</p>
               )}
            </div>

            <div className="mt-4 pt-3 border-t border-ceramic-text-secondary/10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">Ver todos</span>
               <ChevronRight className="w-3 h-3 text-ceramic-text-secondary" />
            </div>
         </div>
      </div>
   );
};

// Main App Router Component
export function AppRouter() {
   const navigate = useNavigate();
   const location = useLocation();
   const [currentView, setCurrentView] = useState<ViewState>('vida');

   // Phase A: Auth Migration - Using useAuth hook instead of manual state
   const { user, session, isLoading: isCheckingAuth, isAuthenticated } = useAuth();

   // Delay showing auth loading spinner by 300ms to avoid flash for fast checks
   const [showAuthLoading, setShowAuthLoading] = useState(false);
   useEffect(() => {
      if (isCheckingAuth) {
         const timer = setTimeout(() => setShowAuthLoading(true), 300);
         return () => clearTimeout(timer);
      }
      setShowAuthLoading(false);
   }, [isCheckingAuth]);
   const userId = user?.id || null;
   const userEmail = user?.email || null;
   const [associations, setAssociations] = useState<any[]>([]);
   const [agenda, setAgenda] = useState<any[]>([]);
   const [lifeAreas, setLifeAreas] = useState<any[]>([]);

   // Association Detail State
   const [selectedAssociation, setSelectedAssociation] = useState<any>(null);
   const [associationModules, setAssociationModules] = useState<any[]>([]);

   // Connection Archetype State
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

   // Onboarding State - DISABLED: Onboarding now optional, users go directly to app
   // const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

   // Sync view state with URL location
   useEffect(() => {
      if (location.pathname === '/' || location.pathname === '/vida') {
         setCurrentView('vida');
      } else if (location.pathname.startsWith('/connections')) {
         setCurrentView('connections');
      }
   }, [location.pathname]);

   // Enhanced view change handler that bridges state and router navigation
   const handleViewChange = useCallback((view: ViewState) => {
      if (view === 'connections') {
         navigate('/connections');
      } else if (view === 'contacts') {
         navigate('/contacts');
      } else {
         // For non-router views, navigate to root and set state
         if (location.pathname !== '/') {
            navigate('/');
         }
         setCurrentView(view);
      }
   }, [navigate, location.pathname]);

   // Listen for navigation events from components without direct access to setCurrentView
   useEffect(() => {
      const handler = (e: Event) => {
         const view = (e as CustomEvent).detail?.view as ViewState;
         if (view) handleViewChange(view);
      };
      window.addEventListener('aica-navigate', handler);
      return () => window.removeEventListener('aica-navigate', handler);
   }, [handleViewChange]);

   // Phase A: Auth Migration Complete
   // Manual session management removed - now handled by useAuth hook
   // The useAuth hook manages: session, user, isLoading, and isAuthenticated

   /**
    * Processa callback do OAuth do Google Calendar
    * Salva tokens no banco de dados para o usuário autenticado
    */
   useEffect(() => {
      if (!isAuthenticated) return;

      // Procesar Google OAuth callback se houver provider_token
      const processGoogleOAuth = async () => {
         try {
            const { data } = await supabase.auth.getSession();

            log.debug(' DEBUG OAuth Session:', {
               hasSession: !!data.session,
               hasProviderToken: !!data.session?.provider_token,
               hasProviderRefreshToken: !!data.session?.provider_refresh_token,
               provider: data.session?.user?.user_metadata?.provider,
               userMetadata: data.session?.user?.user_metadata,
            });

            // Se há provider_token, significa que o OAuth foi concluído recentemente
            if (data.session?.provider_token) {
               log.debug(' Google OAuth callback detected! Saving tokens to database...');
               log.debug(' Provider Token presente:', data.session.provider_token.substring(0, 20) + '...');

               await handleOAuthCallback();

               log.debug(' Google Calendar tokens saved successfully!');
            } else {
               log.debug(' No provider_token found in session');
            }
         } catch (error) {
            log.error(' Erro ao processar callback do Google Calendar:', error);
         }
      };

      processGoogleOAuth();
   }, [isAuthenticated]);

   // ONBOARDING DISABLED: Users now go directly to app without onboarding flow
   // Onboarding is optional and can be accessed manually if needed
   // See migration: 20260107000002_mark_all_users_completed_onboarding.sql

   // Check onboarding status and redirect if needed - COMMENTED OUT
   // useEffect(() => {
   //    if (!isAuthenticated || !user?.id) {
   //       setNeedsOnboarding(null);
   //       return;
   //    }

   //    const checkOnboardingStatus = async () => {
   //       try {
   //          const profile = await getUserProfile(user.id);
   //          const needsOnboard = !profile?.onboarding_completed_at;
   //          setNeedsOnboarding(needsOnboard);

   //          // Redirect to onboarding if needed and not already there
   //          if (needsOnboard && location.pathname !== '/onboarding' && location.pathname !== '/landing') {
   //             log.debug(' User needs onboarding, redirecting...');
   //             navigate('/onboarding', { replace: true });
   //          }
   //       } catch (error) {
   //          log.error(' Error checking onboarding status:', error);
   //          setNeedsOnboarding(false); // Assume completed on error
   //       }
   //    };

   //    checkOnboardingStatus();
   // }, [isAuthenticated, user?.id, location.pathname, navigate]);

   // Navigate from landing to home when auth completes - ONBOARDING DISABLED
   useEffect(() => {
      if (isAuthenticated && location.pathname === '/landing') {
         log.debug(' Auth completed, redirecting to home...');
         navigate('/', { replace: true });
      }
   }, [isAuthenticated, location.pathname, navigate]);

   useEffect(() => {
      if (!isAuthenticated) return;

      const fetchData = async () => {
         try {
            let assocs = await getAssociations();

            // Bootstrap: Create "Vida Pessoal" if no associations exist
            if (assocs.length === 0) {
               log.debug('Bootstrapping: Creating Vida Pessoal...');
               try {
                  await createAssociation({
                     name: 'Vida Pessoal',
                     description: 'Gestão pessoal e familiar',
                     type: 'personal'
                  });
                  assocs = await getAssociations();
               } catch (err) {
                  log.error('Bootstrap failed (likely missing type column):', err);
               }
            }

            const [daily, areas] = await Promise.all([
               getDailyAgenda(),
               getLifeAreas()
            ]);

            setAssociations(assocs as any);
            setAgenda(daily as any);
            setLifeAreas(areas as any);
         } catch (error) {
            log.error('Error fetching data:', error);
         }
      };

      fetchData();
   }, [isAuthenticated]);


   const handleOpenAssociation = async (assoc: any) => {
      setSelectedAssociation(assoc);
      setCurrentView('association_detail');
      // Filter modules for this association
      const modules = lifeAreas.filter(area => area.association_id === assoc.id);
      setAssociationModules(modules);
   };

   const handleSelectArchetype = (archetypeId: string | null) => {
      log.debug(' Arquétipo selecionado:', archetypeId);
      setSelectedArchetype(archetypeId);
      setShowCreateModal(true);
   };

   const handleCreateAssociation = () => {
      log.debug(' Criar espaço personalizado');
      setSelectedArchetype(null);
      setShowCreateModal(true);
   };

   // Handle onboarding completion


   // ==================== MINHA VIDA VIEW ====================
   // VidaPage is the homepage — rendered at both / and /vida
   const renderVida = () => (
      userId ? (
         <VidaPage
            userId={userId}
            userEmail={userEmail}
            associations={associations}
            lifeAreas={lifeAreas}
            onLogout={() => supabase.auth.signOut()}
            onNavigateToView={setCurrentView}
            onNavigateToFileSearch={() => setCurrentView('file-search-analytics')}
            onOpenAssociation={handleOpenAssociation}
            onSelectArchetype={handleSelectArchetype}
            onCreateAssociation={handleCreateAssociation}
         />
      ) : <CeramicLoadingState variant="page" />
   );

   // ==================== MEU DIA (AGENDA) VIEW ====================
   const renderAgenda = () => (
      userId ? (
         <AgendaView
            userId={userId}
            userEmail={userEmail || undefined}
            onLogout={() => supabase.auth.signOut()}
         />
      ) : <CeramicLoadingState variant="page" />
   );

   // ==================== ASSOCIATION DETAIL VIEW ====================
   const renderAssociationDetail = () => {
      if (!selectedAssociation) return null;

      return (
         <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32 animate-fade-in-up">
            {/* Header */}
            <div className="pt-8 px-6 pb-6">
               <button
                  onClick={() => setCurrentView('vida')}
                  className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
               >
                  <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
                     <ArrowRight className="w-4 h-4 rotate-180" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
               </button>

               <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 ceramic-card flex items-center justify-center">
                     <Users className="w-8 h-8 text-ceramic-text-primary" />
                  </div>
                  <div>
                     <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5">Associação</p>
                     <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">{selectedAssociation.name}</h1>
                  </div>
               </div>
               <p className="text-ceramic-text-secondary font-light pl-20">{selectedAssociation.description}</p>
            </div>

            {/* Modules Grid */}
            <div className="px-6 grid grid-cols-2 gap-4">
               {associationModules.length > 0 ? (
                  associationModules.map(module => (
                     <ModuleCard
                        key={module.id}
                        moduleId={module.id}
                        title={module.name}
                        icon={Briefcase} // Default icon for dynamic modules
                        color="indigo"
                        accentColor="bg-indigo-50 border-indigo-100 text-indigo-600"
                     />
                  ))
               ) : (
                  <div className="col-span-2 ceramic-inset p-8 text-center">
                     <p className="text-ceramic-text-secondary font-light">Nenhum módulo configurado nesta associação.</p>
                     <button className="mt-4 px-6 py-2 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform">
                        Adicionar Módulo
                     </button>
                  </div>
               )}
            </div>
         </div>
      );
   };



   // ==================== STUDIO VIEW ====================
   const renderStudio = () => (
      <StudioProvider>
         <StudioMainView />
      </StudioProvider>
   );

   // ==================== CONNECTIONS VIEW ====================
   const renderConnections = () => (
      <ConnectionsPage />
   );

   // ==================== FINANCE VIEW ====================
   const renderFinance = () => (
      userId ? (
         <FinanceDashboard
            userId={userId}
            onBack={() => setCurrentView('vida')}
         />
      ) : <CeramicLoadingState variant="page" />
   );

   // ==================== JOURNEY VIEW ====================
   const renderJourney = () => (
      <JourneyFullScreen onBack={() => setCurrentView('vida')} />
   );

   // Main App Content (authenticated state)
   const renderMainApp = () => {
      return <MainAppWithNavigation />;
   };

   // Main App component with navigation context
   function MainAppWithNavigation() {
      const { isFocusedMode } = useNavigation();

      // Define focused modes where global nav should be hidden (Contextual Descent)
      const focusedModes: ViewState[] = [
         'association_detail', 'finance', 'grants', 'file-search-analytics',
         'studio', 'eraforge',
         // Life Area Modules
         'health', 'education', 'legal', 'professional'
      ];

      // Determine if we should show BottomNav
      // Hide when:
      // 1. In NavigationContext focused mode
      // 2. In a focused ViewState mode
      // 3. On detail/section routes (these are handled by React Router and don't use BottomNav)
      const isInFocusedViewState = focusedModes.includes(currentView);
      const isOnDetailRoute = location.pathname.match(/^\/connections\/[^/]+$/) && location.pathname !== '/connections';

      const shouldShowGlobalNav = !isFocusedMode &&
         !isInFocusedViewState &&
         !isOnDetailRoute;

      return (
         <div className="bg-ceramic-base min-h-screen font-sans text-ceramic-text-primary">
            <AnimatePresence mode="wait">
            {currentView === 'vida' && <motion.div key="vida" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">{renderVida()}</motion.div>}
            {currentView === 'agenda' && <motion.div key="agenda" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit"><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Agenda" />}>{renderAgenda()}</ErrorBoundary></motion.div>}
            {currentView === 'connections' && <motion.div key="connections" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit"><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Connections" />}>{renderConnections()}</ErrorBoundary></motion.div>}
            {currentView === 'studio' && <motion.div key="studio" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit"><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Studio" />}>{renderStudio()}</ErrorBoundary></motion.div>}
            {currentView === 'association_detail' && <motion.div key="association_detail" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">{renderAssociationDetail()}</motion.div>}
            {currentView === 'finance' && <motion.div key="finance" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit"><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Finance" />}>{renderFinance()}</ErrorBoundary></motion.div>}
            {currentView === 'journey' && <motion.div key="journey" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit"><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Journey" />}>{renderJourney()}</ErrorBoundary></motion.div>}
            {currentView === 'grants' && (
               <motion.div key="grants" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Grants" />}>
                     <GrantsModuleView onBack={() => setCurrentView('vida')} />
                  </ErrorBoundary>
               </motion.div>
            )}
            {currentView === 'eraforge' && (
               <motion.div key="eraforge" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="EraForge" />}>
                     <EraforgeGameProvider>
                        <EraforgeVoiceProvider>
                           <EraForgeMainView onExitToApp={() => setCurrentView('vida')} />
                        </EraforgeVoiceProvider>
                     </EraforgeGameProvider>
                  </ErrorBoundary>
               </motion.div>
            )}
            {currentView === 'file-search-analytics' && userId && (
               <motion.div key="file-search" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <FileSearchAnalyticsView
                     userId={userId}
                     onBack={() => setCurrentView('vida')}
                     mode="fullpage"
                  />
               </motion.div>
            )}

            {/* Life Area Module Views */}
            {currentView === 'health' && (
               <motion.div key="health" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <LifeAreaView moduleId="health" onBack={() => setCurrentView('vida')} />
               </motion.div>
            )}
            {currentView === 'education' && (
               <motion.div key="education" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <LifeAreaView moduleId="education" onBack={() => setCurrentView('vida')} />
               </motion.div>
            )}
            {currentView === 'legal' && (
               <motion.div key="legal" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <LifeAreaView moduleId="legal" onBack={() => setCurrentView('vida')} />
               </motion.div>
            )}
            {currentView === 'professional' && (
               <motion.div key="professional" variants={pageTransitionVariants} initial="initial" animate="animate" exit="exit">
                  <LifeAreaView moduleId="professional" onBack={() => setCurrentView('vida')} />
               </motion.div>
            )}
            </AnimatePresence>

            {/* ANCHOR PRINCIPLE: Global Navigation - Unified visibility logic via NavigationContext */}
            {shouldShowGlobalNav && (
               <BottomNav
                  currentView={currentView}
                  onChange={handleViewChange}
               />
            )}

            {/* Aica Chat FAB - Floating button for quick AI access */}
            {/* On home page, FAB button is hidden but drawer stays functional via CustomEvent from VidaChatHero (#391) */}
            {isAuthenticated && <AicaChatFAB position="bottom-left" bottomOffset={shouldShowGlobalNav ? 80 : 16} hideButton={currentView === 'vida'} />}

            {/* Notification Toast Container */}
            <NotificationContainer />
         </div>
      );
   }

   // Show loading screen while checking authentication (300ms delay to avoid flash)
   if (isCheckingAuth) {
      if (!showAuthLoading) return <div className="h-screen w-full bg-ceramic-base" />;
      return (
         <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
            <div className="text-center space-y-4">
               <div className="w-16 h-16 mx-auto ceramic-concave rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-ceramic-accent border-t-transparent rounded-full animate-spin"></div>
               </div>
               <p className="text-ceramic-text-secondary text-sm font-medium">Verificando autenticação...</p>
            </div>
         </div>
      );
   }

   // Layout wrapper for connections routes with bottom nav
   const ConnectionsLayout = ({ children }: { children: React.ReactNode }) => (
      <div className="bg-ceramic-base min-h-screen font-sans text-ceramic-text-primary">
         {children}

         {/* ANCHOR PRINCIPLE: Global Navigation */}
         <BottomNav
            currentView={currentView}
            onChange={handleViewChange}
         />
      </div>
   );

   // Use React Router Routes to ensure proper Router context for all components
   // Wrapped in Suspense to handle lazy-loaded components
   // TourProvider enables contextual onboarding tours (Phase 2 - Organic Onboarding)
   return (
      <ErrorBoundary>
      <TourProvider tours={allTours}>
         <XPNotificationProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-ceramic-base"><CeramicLoadingState variant="page" /></div>}>
               <Routes>
               {/* Landing Page - Official version (consolidated from V4) */}
               <Route
                  path="/landing"
                  element={<LandingPage />}
               />

               {/* Privacy Policy - Public route */}
               <Route
                  path="/privacy"
                  element={<PrivacyPolicyPage />}
               />
               <Route
                  path="/privacy-policy"
                  element={<PrivacyPolicyPage />}
               />

               {/* Terms of Service - Public route */}
               <Route
                  path="/terms"
                  element={<TermsOfServicePage />}
               />

               {/* Service Status - Protected route (issue #599) */}
               <Route
                  path="/status"
                  element={<ProtectedRoute><StatusPage /></ProtectedRoute>}
               />

               {/* Presentation Demo - Public route for testing Issue #117 */}
               <Route
                  path="/presentation-demo"
                  element={<PresentationDemo />}
               />

               {/* Invite Accept - Public route for viral invites */}
               <Route
                  path="/invite/:token"
                  element={<InviteAcceptPage />}
               />

               {/* Onboarding Flow - Protected, for new users */}
               <Route
                  path="/onboarding"
                  element={<ProtectedRoute><OnboardingFlow /></ProtectedRoute>}
               />

               {/* Connections Module Routes - Simplified 2-level navigation */}
               <Route path="/connections" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Connections" />}><ConnectionsLayout><ConnectionsPage /></ConnectionsLayout></ErrorBoundary></ProtectedRoute>} />
               <Route path="/connections/:spaceId" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Connections" />}><SpaceDetailView /></ErrorBoundary></ProtectedRoute>} />
               {/* Legacy redirects: old /connections/:archetype/:spaceId → new /connections/:spaceId */}
               <Route path="/connections/:archetype/:spaceId" element={<LegacySpaceRedirect />} />
               <Route path="/connections/:archetype/:spaceId/:section" element={<LegacySpaceRedirect />} />
               <Route path="/connections/analytics/whatsapp" element={<Navigate to="/contacts" replace />} />

               {/* Studio Module Routes - Protected */}
               <Route
                  path="/studio"
                  element={
                     <ProtectedRoute>
                        <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Studio" />}>
                           <StudioProvider>
                              <StudioMainView />
                           </StudioProvider>
                        </ErrorBoundary>
                     </ProtectedRoute>
                  }
               />

               {/* Studio Calendar & Analytics Routes - Protected */}
               <Route
                  path="/studio/calendar"
                  element={
                     <ProtectedRoute>
                        <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Studio" />}>
                           <ContentCalendarPage />
                        </ErrorBoundary>
                     </ProtectedRoute>
                  }
               />
               <Route
                  path="/studio/analytics"
                  element={
                     <ProtectedRoute>
                        <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Studio" />}>
                           <StudioAnalyticsPage />
                        </ErrorBoundary>
                     </ProtectedRoute>
                  }
               />

               {/* Flux Module Routes - Protected */}
               <Route path="/flux" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><FluxDashboard /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/athlete/:athleteId" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><FluxAthleteDetailView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/canvas" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><FluxCanvasEditorView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/canvas/:athleteId/:blockId?" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><FluxCanvasEditorView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/alerts" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><FluxAlertsView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />

               {/* Flow Module Routes (Intelligent Prescription) - Protected */}
               <Route path="/flux/templates" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><TemplateLibraryView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/templates/new" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><TemplateLibraryView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/templates/:templateId/edit" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><TemplateLibraryView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/microcycle/:microcycleId" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><MicrocycleEditorView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/leveling" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><LevelingEngineView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/intensity/:athleteId?" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><IntensityCalculatorView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/crm" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><CRMCommandCenterView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />
               <Route path="/flux/parq/:athleteId" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Flux" />}><FluxProvider><ParQFormView /></FluxProvider></ErrorBoundary></ProtectedRoute>} />

               {/* EraForge Module - Historical simulation game */}
               <Route path="/eraforge" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="EraForge" />}><EraForgeAccessGuard><EraforgeGameProvider><EraforgeVoiceProvider><EraForgeMainView onExitToApp={() => navigate('/')} /></EraforgeVoiceProvider></EraforgeGameProvider></EraForgeAccessGuard></ErrorBoundary></ProtectedRoute>} />

               {/* Athlete Portal - Read-only training view (no FluxProvider needed, athlete context) */}
               <Route path="/meu-treino" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Meu Treino" />}><AthletePortalView /></ErrorBoundary></ProtectedRoute>} />

               {/* Google Hub - Calendar integration dashboard */}
               <Route path="/google-hub" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Google Hub" />}><GoogleHubPage /></ErrorBoundary></ProtectedRoute>} />

               {/* Guest Portal - Read-only episode view for podcast guests */}
               <Route path="/meu-episodio" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Meu Episodio" />}><GuestPortalView /></ErrorBoundary></ProtectedRoute>} />

               {/* Platform Contacts - Unified contact management */}
               <Route path="/contatos" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Contatos" />}><ContactsPage /></ErrorBoundary></ProtectedRoute>} />

               {/* Contacts Module Routes - Protected */}
               <Route
                  path="/contacts"
                  element={
                     <ProtectedRoute>
                        <ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Contacts" />}>
                           <ConnectionsLayout>
                              <ContactsView />
                           </ConnectionsLayout>
                        </ErrorBoundary>
                     </ProtectedRoute>
                  }
               />

               {/* PWA Share Target - Receives shared files from WhatsApp (Issue #211) */}
               <Route
                  path="/share-target"
                  element={<ProtectedRoute><ShareTargetPage /></ProtectedRoute>}
               />

               {/* Diagnostics Page - PUBLIC (needs to be accessible to fix auth issues) */}
               <Route
                  path="/diagnostics"
                  element={<DiagnosticsPage />}
               />


               {/* File Search Analytics - Protected */}
               <Route
                  path="/file-search"
                  element={<ProtectedRoute><FileSearchAnalyticsView userId={userId || ''} onBack={() => navigate('/')} mode="fullpage" /></ProtectedRoute>}
               />

               {/* Profile Page - Protected */}
               <Route
                  path="/profile"
                  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
               />

               {/* Invites Dashboard - Protected */}
               <Route
                  path="/invites"
                  element={<ProtectedRoute><InvitesPage /></ProtectedRoute>}
               />

               {/* Billing Module Routes - Protected */}
               <Route
                  path="/pricing"
                  element={<ProtectedRoute><PricingPage /></ProtectedRoute>}
               />
               <Route
                  path="/manage-subscription"
                  element={<ProtectedRoute><ManageSubscriptionPage /></ProtectedRoute>}
               />

               {/* AI Cost Dashboard - Usage monitoring */}
               <Route
                  path="/ai-cost"
                  element={<ProtectedRoute><AICostDashboard userId={userId || ''} onBack={() => navigate(-1)} /></ProtectedRoute>}
               />

               {/* Admin Portal — admin-only routes */}
               <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminPortalPage /></AdminGuard></ProtectedRoute>} />
               <Route path="/admin/coupons" element={<ProtectedRoute><AdminGuard><AdminCouponsPage /></AdminGuard></ProtectedRoute>} />
               <Route path="/admin/simulator" element={<ProtectedRoute><AdminGuard><PricingSimulatorPage /></AdminGuard></ProtectedRoute>} />

               {/* Module Hub - Coming Soon system (CS-004) */}
               <Route
                  path="/modules"
                  element={<ProtectedRoute><ModuleHubPage /></ProtectedRoute>}
               />

               {/* Life RPG Module - Entity personas as RPG characters */}
               <Route path="/liferpg" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Life RPG" />}><LifeRPGMainView /></ErrorBoundary></ProtectedRoute>} />
               <Route path="/liferpg/:personaId" element={<ProtectedRoute><ErrorBoundary autoRetryMs={2000} maxRetries={3} fallback={<ModuleErrorFallback moduleName="Life RPG" />}><LifeRPGDetailView /></ErrorBoundary></ProtectedRoute>} />

               {/* Home - VidaPage (central hub) */}
               <Route
                  path="/"
                  element={<ProtectedRoute>{renderMainApp()}</ProtectedRoute>}
               />

               {/* Vida alias - same as / for backward compatibility */}
               <Route
                  path="/vida"
                  element={<ProtectedRoute>{renderMainApp()}</ProtectedRoute>}
               />

               {/* Chat Module - Full-page chat */}
               <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

               {/* 404 Not Found - Catch all unknown routes */}
               <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
         </XPNotificationProvider>
      </TourProvider>
      </ErrorBoundary>
   );
}
