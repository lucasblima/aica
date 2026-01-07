import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { handleOAuthCallback } from '../services/googleAuthService';
import { BottomNav } from '../../components/BottomNav';
import { getAssociations, getDailyAgenda, getLifeAreas, createAssociation, getModuleTasks } from '../services/supabaseService';
import { generateMissingDailyReports } from '../services/dailyReportService';
import { NotificationContainer } from '../components/NotificationContainer';
import { ViewState } from '../../types';
import { useNavigation } from '../contexts/NavigationContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { StudioProvider } from '../modules/studio/context/StudioContext';
import { useAuth } from '../hooks/useAuth';
import { XPNotificationProvider } from '../contexts/XPNotificationContext';

// ==================== LAZY LOADED MODULES ====================
// Heavy modules are loaded on-demand to reduce initial bundle size
// This improves First Contentful Paint (FCP) and Time to Interactive (TTI)

// Core Views - Frequently accessed, loaded lazily
const Home = lazy(() => import('../pages/Home'));
const AgendaView = lazy(() => import('../views/AgendaView').then(m => ({ default: m.AgendaView })));

// Journey Module - Self-contained feature
const JourneyFullScreen = lazy(() => import('../modules/journey/views/JourneyFullScreen').then(m => ({ default: m.JourneyFullScreen })));

// Studio Module - Podcast production with FSM architecture
const StudioMainView = lazy(() => import('../modules/studio/views/StudioMainView'));
const GuestApprovalPage = lazy(() => import('../modules/podcast/views/GuestApprovalPage').then(m => ({ default: m.GuestApprovalPage })));

// Finance Module - Heavy with charts and data processing
const FinanceDashboard = lazy(() => import('../modules/finance/views/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const FinanceAgentView = lazy(() => import('../modules/finance/views/FinanceAgentView').then(m => ({ default: m.FinanceAgentView })));

// Grants Module - Document processing intensive
const GrantsModuleView = lazy(() => import('../modules/grants/views/GrantsModuleView').then(m => ({ default: m.GrantsModuleView })));

// Connections Module - Multiple nested views
const ConnectionsPage = lazy(() => import('../pages/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const ArchetypeListPage = lazy(() => import('../pages/ArchetypeListPage').then(m => ({ default: m.ArchetypeListPage })));
const SpaceDetailPage = lazy(() => import('../pages/SpaceDetailPage').then(m => ({ default: m.SpaceDetailPage })));
const SpaceSectionPage = lazy(() => import('../pages/SpaceSectionPage').then(m => ({ default: m.SpaceSectionPage })));

// Onboarding Module - Only loaded for new users
const LandingPageComponent = lazy(() => import('../modules/onboarding/components/landing').then(m => ({ default: m.default })));
const LandingPageV3 = lazy(() => import('../modules/onboarding/components/landing-v3').then(m => ({ default: m.LandingPageV3 })));
const LandingPageV4 = lazy(() => import('../modules/onboarding/components/landing-v4').then(m => ({ default: m.LandingPageV4 })));

// Analytics/Settings - Rarely accessed
const AICostDashboard = lazy(() => import('../components/aiCost/AICostDashboard').then(m => ({ default: m.AICostDashboard })));
const FileSearchAnalyticsView = lazy(() => import('../components/fileSearch/FileSearchAnalyticsView').then(m => ({ default: m.FileSearchAnalyticsView })));

// Legal Pages - Rarely accessed
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));


const ProfilePage = lazy(() => import('../views/ProfilePage').then(m => ({ default: m.ProfilePage })));
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

   // Onboarding State

   // Sync view state with URL location
   useEffect(() => {
      if (location.pathname.startsWith('/connections')) {
         setCurrentView('connections');
      }
   }, [location.pathname]);

   // Enhanced view change handler that bridges state and router navigation
   const handleViewChange = (view: ViewState) => {
      if (view === 'connections') {
         navigate('/connections');
      } else {
         // For non-router views, navigate to root and set state
         if (location.pathname !== '/') {
            navigate('/');
         }
         setCurrentView(view);
      }
   };

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

            console.log('[App] DEBUG OAuth Session:', {
               hasSession: !!data.session,
               hasProviderToken: !!data.session?.provider_token,
               hasProviderRefreshToken: !!data.session?.provider_refresh_token,
               provider: data.session?.user?.user_metadata?.provider,
               userMetadata: data.session?.user?.user_metadata,
            });

            // Se há provider_token, significa que o OAuth foi concluído recentemente
            if (data.session?.provider_token) {
               console.log('[App] Google OAuth callback detected! Saving tokens to database...');
               console.log('[App] Provider Token presente:', data.session.provider_token.substring(0, 20) + '...');

               await handleOAuthCallback();

               console.log('[App] Google Calendar tokens saved successfully!');
            } else {
               console.log('[App] No provider_token found in session');
            }
         } catch (error) {
            console.error('[App] Erro ao processar callback do Google Calendar:', error);
         }
      };

      processGoogleOAuth();
   }, [isAuthenticated]);

   // Navigate from landing to home when auth completes
   useEffect(() => {
      if (isAuthenticated && location.pathname === '/landing') {
         console.log('[AppRouter] Auth completed, navigating from /landing to /');
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
               console.log('Bootstrapping: Creating Vida Pessoal...');
               try {
                  await createAssociation({
                     name: 'Vida Pessoal',
                     description: 'Gestão pessoal e familiar',
                     type: 'personal'
                  });
                  assocs = await getAssociations();
               } catch (err) {
                  console.error('Bootstrap failed (likely missing type column):', err);
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
            console.error('Error fetching data:', error);
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
      console.log('[App] Arquétipo selecionado:', archetypeId);
      setSelectedArchetype(archetypeId);
      setShowCreateModal(true);
   };

   const handleCreateAssociation = () => {
      console.log('[App] Criar espaço personalizado');
      setSelectedArchetype(null);
      setShowCreateModal(true);
   };

   // Handle onboarding completion


   // ==================== MINHA VIDA VIEW ====================
   // Uses the updated Home component from src/pages/Home.tsx with Ceramic Design System
   const renderVida = () => (
      userId ? (
         <Home
            userId={userId}
            userEmail={userEmail}
            associations={associations}
            lifeAreas={lifeAreas}
            onLogout={() => supabase.auth.signOut()}
            onNavigateToView={setCurrentView}
            onNavigateToAICost={() => setCurrentView('ai-cost')}
            onNavigateToFileSearch={() => setCurrentView('file-search-analytics')}
            onOpenAssociation={handleOpenAssociation}
            onSelectArchetype={handleSelectArchetype}
            onCreateAssociation={handleCreateAssociation}
         />
      ) : null
   );

   // ==================== MEU DIA (AGENDA) VIEW ====================
   const renderAgenda = () => (
      userId ? (
         <AgendaView
            userId={userId}
            userEmail={userEmail || undefined}
            onLogout={() => supabase.auth.signOut()}
         />
      ) : null
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
            onNavigateToAgent={() => setCurrentView('finance_agent')}
            onBack={() => setCurrentView('vida')}
         />
      ) : null
   );

   // ==================== FINANCE AGENT VIEW ====================
   const renderFinanceAgent = () => (
      userId ? (
         <FinanceAgentView
            userId={userId}
            onBack={() => setCurrentView('finance')}
         />
      ) : null
   );

   // ==================== JOURNEY VIEW ====================
   const renderJourney = () => (
      <JourneyFullScreen />
   );

   // Main App Content (authenticated state)
   const renderMainApp = () => {
      return <MainAppWithNavigation />;
   };

   // Main App component with navigation context
   function MainAppWithNavigation() {
      const { isFocusedMode } = useNavigation();

      // Define focused modes where global nav should be hidden (Contextual Descent)
      const focusedModes: ViewState[] = ['association_detail', 'finance', 'finance_agent', 'grants', 'ai-cost', 'file-search-analytics', 'journey'];

      // Determine if we should show BottomNav
      // Hide when:
      // 1. In NavigationContext focused mode
      // 2. In a focused ViewState mode
      // 3. On detail/section routes (these are handled by React Router and don't use BottomNav)
      const isInFocusedViewState = focusedModes.includes(currentView);
      const isOnDetailRoute = location.pathname.match(/^\/connections\/[^/]+\/[^/]+/);

      const shouldShowGlobalNav = !isFocusedMode &&
                                   !isInFocusedViewState &&
                                   !isOnDetailRoute;

      return (
         <div className="bg-ceramic-base min-h-screen font-sans text-ceramic-text-primary">
            {currentView === 'vida' && renderVida()}
            {currentView === 'agenda' && renderAgenda()}
            {currentView === 'connections' && renderConnections()}
            {currentView === 'studio' && renderStudio()}
            {currentView === 'association_detail' && renderAssociationDetail()}
            {currentView === 'finance' && renderFinance()}
            {currentView === 'finance_agent' && renderFinanceAgent()}
            {currentView === 'journey' && renderJourney()}
            {currentView === 'grants' && (
               <GrantsModuleView onBack={() => setCurrentView('vida')} />
            )}
            {currentView === 'ai-cost' && userId && (
               <AICostDashboard userId={userId} onBack={() => setCurrentView('vida')} />
            )}
            {currentView === 'file-search-analytics' && userId && (
               <FileSearchAnalyticsView
                  userId={userId}
                  onBack={() => setCurrentView('vida')}
                  mode="fullpage"
               />
            )}

            {/* ANCHOR PRINCIPLE: Global Navigation - Unified visibility logic via NavigationContext */}
            {shouldShowGlobalNav && (
               <BottomNav
                  currentView={currentView}
                  onChange={handleViewChange}
                  onMicClick={() => alert('Voice AI Coming Soon')}
                  isListening={false}
               />
            )}
            {/* Notification Toast Container */}
            <NotificationContainer />
         </div>
      );
   }

   // Show loading screen while checking authentication
   if (isCheckingAuth) {
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
            onMicClick={() => alert('Voice AI Coming Soon')}
            isListening={false}
         />
      </div>
   );

   // Use React Router Routes to ensure proper Router context for all components
   // Wrapped in Suspense to handle lazy-loaded components
   return (
      <XPNotificationProvider>
         <Suspense fallback={<LoadingScreen message="Carregando..." />}>
            <Routes>
            {/* Guest Approval Page - Public route for podcast guests */}
            <Route
               path="/guest-approval/:episodeId/:approvalToken"
               element={<GuestApprovalPage />}
            />

            {/* Landing Page - Consolidated version (Issue #39) */}
            <Route
               path="/landing"
               element={<LandingPageComponent />}
            />

            {/* Landing Page V3 - Previous version (backup) */}
            <Route
               path="/landing-v3"
               element={<LandingPageV3 />}
            />

            {/* Landing Page V4 - Alternative version (backup) */}
            <Route
               path="/landing-v4"
               element={<LandingPageV4 />}
            />

            {/* Privacy Policy - Public route */}
            <Route
               path="/privacy"
               element={<PrivacyPolicyPage />}
            />

            {/* Terms of Service - Public route */}
            <Route
               path="/terms"
               element={<TermsOfServicePage />}
            />

            {/* Connections Module Routes - Protected */}
            {isAuthenticated && (
               <>
                  {/* Global navigation visible on main connections views */}
                  <Route path="/connections" element={<ConnectionsLayout><ConnectionsPage /></ConnectionsLayout>} />
                  <Route path="/connections/:archetype" element={<ConnectionsLayout><ArchetypeListPage /></ConnectionsLayout>} />

                  {/* Contextual descent: Detail and section views have back button, no bottom nav */}
                  <Route path="/connections/:archetype/:spaceId" element={<SpaceDetailPage />} />
                  <Route path="/connections/:archetype/:spaceId/:section" element={<SpaceSectionPage />} />
               </>
            )}

            {/* Studio Module Routes - Protected */}
            {isAuthenticated && (
               <>
                  {/* Main Studio route with new StudioMainView */}
                  <Route
                     path="/studio"
                     element={
                        <StudioProvider>
                           <StudioMainView />
                        </StudioProvider>
                     }
                  />
               </>
            )}

            {/* Main App - Authenticated users */}
            <Route
               path="/*"
               element={isAuthenticated ? renderMainApp() : <Navigate to="/landing" replace />}
            />
            </Routes>
         </Suspense>
      </XPNotificationProvider>
   );
}
