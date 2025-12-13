import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Briefcase, ChevronRight, Plus, Wallet, Heart, BookOpen, Scale, Building2, Mic, CheckCircle2 } from 'lucide-react';
import { supabase } from './src/services/supabaseClient';
import { handleOAuthCallback } from './src/services/googleAuthService';
import { BottomNav } from './components/BottomNav';
import { JourneyFullScreen } from './src/modules/journey/views/JourneyFullScreen';
import { AgendaView } from './src/views/AgendaView';
import { PodcastCopilotView } from './src/views/PodcastCopilotView';
import { getAssociations, getDailyAgenda, getLifeAreas, createAssociation, getModuleTasks, hasCompletedOnboarding, completeOnboarding } from './src/services/supabaseService';
import { generateMissingDailyReports } from './src/services/dailyReportService';
import { FinanceDashboard } from './src/modules/finance/views/FinanceDashboard';
import { FinanceAgentView } from './src/modules/finance/views/FinanceAgentView';
import { GrantsModuleView } from './src/modules/grants/views/GrantsModuleView';
import { NotificationContainer } from './src/components/NotificationContainer';
import { AICostDashboard } from './src/components/aiCost/AICostDashboard';
import { FileSearchAnalyticsView } from './src/components/fileSearch/FileSearchAnalyticsView';
import { ViewState } from './types';
import { LandingPage, OnboardingFlow } from './src/modules/onboarding';
import Home from './src/pages/Home';
import { GuestApprovalPage } from './src/modules/podcast/views/GuestApprovalPage';
import { HeaderGlobal } from './src/components/HeaderGlobal';
import { JourneyCardCollapsed } from './src/modules/journey/views/JourneyCardCollapsed';
import { ConsciousnessScore } from './src/modules/journey/components/gamification/ConsciousnessScore';
import { FinanceCard } from './src/modules/finance/components/FinanceCard';
import { GrantsCard } from './src/modules/grants/components/GrantsCard';
import { ConnectionArchetypes } from './src/components/ConnectionArchetypes';
import { useConsciousnessPoints } from './src/modules/journey/hooks/useConsciousnessPoints';

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

export default function App() {
   const [currentView, setCurrentView] = useState<ViewState>('vida');
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [isCheckingAuth, setIsCheckingAuth] = useState(true);
   const [userId, setUserId] = useState<string | null>(null);
   const [userEmail, setUserEmail] = useState<string | null>(null);
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
   const [showOnboarding, setShowOnboarding] = useState(false);
   const [checkingOnboarding, setCheckingOnboarding] = useState(true);

   // Podcast Nav State
   const [showPodcastNav, setShowPodcastNav] = useState(true);

   // Tab State for Vida view (personal vs network)
   const [activeTab, setActiveTab] = useState<'personal' | 'network'>('personal');

   // Secondary modules loading state
   const [secondaryModulesStatus, setSecondaryModulesStatus] = useState<Record<string, { loaded: boolean; empty: boolean }>>({});

   // Consciousness Points Hook
   const { stats: consciousnessStats, isLoading: cpLoading } = useConsciousnessPoints();

   // Grants Stats (default values - can be replaced with a hook later)
   const grantsActiveProjects = 0;
   const grantsUpcomingDeadlines = 0;
   const grantsRecentProjects: any[] = [];

   // Animation variants for cards
   const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: (i: number) => ({
         opacity: 1,
         y: 0,
         transition: {
            delay: i * 0.1,
            duration: 0.4,
            ease: 'easeOut'
         }
      })
   };

   // Handle secondary module tasks loaded
   const handleTasksLoaded = (moduleId: string, tasks: any[]) => {
      setSecondaryModulesStatus(prev => ({
         ...prev,
         [moduleId]: { loaded: true, empty: tasks.length === 0 }
      }));
   };

   // Check if all secondary modules are loaded and empty
   const secondaryModuleIds = ['health', 'education', 'legal'];
   const allSecondaryModulesLoaded = secondaryModuleIds.every(id => secondaryModulesStatus[id]?.loaded);
   const allSecondaryModulesEmpty = secondaryModuleIds.every(id => secondaryModulesStatus[id]?.empty);

   useEffect(() => {
      const initAuth = async () => {
         try {
            setIsCheckingAuth(true);
            console.log('[App] 🔐 Verificando sessão de autenticação...');

            // Detecta e limpa URLs com tokens OAuth expirados
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const hasAuthParams = hashParams.has('access_token') ||
               hashParams.has('refresh_token') ||
               hashParams.has('error');

            if (hasAuthParams) {
               console.log('[App] 🔍 Detectados parâmetros de autenticação na URL');
            }

            // CRITICAL: Wait for session check BEFORE rendering routes
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
               console.error('[App] ❌ Erro ao verificar sessão:', error);
            }

            if (session) {
               console.log('[App] ✅ Sessão válida encontrada');
               setIsAuthenticated(true);
               setUserId(session.user.id);
               setUserEmail(session.user.email || null);
            } else {
               console.log('[App] ⚠️ Nenhuma sessão válida encontrada');
               setIsAuthenticated(false);
               setUserId(null);
               setUserEmail(null);

               // Limpa parâmetros OAuth expirados da URL
               if (hasAuthParams) {
                  console.log('[App] 🧹 Limpando parâmetros de autenticação expirados da URL');
                  window.history.replaceState(null, '', window.location.pathname);
               }
            }
         } catch (error) {
            console.error('[App] ❌ Erro crítico ao verificar autenticação:', error);
            setIsAuthenticated(false);
            setUserId(null);
            setUserEmail(null);
         } finally {
            setIsCheckingAuth(false);
            console.log('[App] 🏁 Verificação de autenticação concluída');
         }
      };

      initAuth();

      // Listen for auth state changes
      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         console.log('[App] 🔄 Auth state changed:', _event);
         setIsAuthenticated(!!session);
         setUserId(session?.user?.id || null);
         setUserEmail(session?.user?.email || null);
      });

      return () => subscription.unsubscribe();
   }, []);

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

            console.log('[App] 🔍 DEBUG OAuth Session:', {
               hasSession: !!data.session,
               hasProviderToken: !!data.session?.provider_token,
               hasProviderRefreshToken: !!data.session?.provider_refresh_token,
               provider: data.session?.user?.user_metadata?.provider,
               userMetadata: data.session?.user?.user_metadata,
            });

            // Se há provider_token, significa que o OAuth foi concluído recentemente
            if (data.session?.provider_token) {
               console.log('[App] ✅ Google OAuth callback detected! Saving tokens to database...');
               console.log('[App] Provider Token presente:', data.session.provider_token.substring(0, 20) + '...');

               await handleOAuthCallback();

               console.log('[App] ✅ Google Calendar tokens saved successfully!');
            } else {
               console.log('[App] ⚠️ No provider_token found in session');
            }
         } catch (error) {
            console.error('[App] ❌ Erro ao processar callback do Google Calendar:', error);
            // Não interrompe o fluxo da app se houver erro no callback
         }
      };

      processGoogleOAuth();
   }, [isAuthenticated]);

   /**
    * Gera relatórios diários faltantes após autenticação
    * Fire-and-forget para não bloquear a UI
    */
   useEffect(() => {
      if (!userId) return;

      // Fire-and-forget: executa em background sem bloquear a UI
      generateMissingDailyReports(userId).catch((error) => {
         // Tratamento de erro silencioso - apenas log no console
         console.error('[App] Erro ao gerar relatórios diários:', error);
      });
   }, [userId]);

   // Check onboarding status after authentication
   useEffect(() => {
      const checkOnboarding = async () => {
         if (!userId) {
            setCheckingOnboarding(false);
            return;
         }

         try {
            const completed = await hasCompletedOnboarding(userId);
            setShowOnboarding(!completed);
         } catch (error) {
            console.error('Error checking onboarding:', error);
         } finally {
            setCheckingOnboarding(false);
         }
      };

      checkOnboarding();
   }, [userId]);

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
   const handleOnboardingComplete = async (connectedCalendar: boolean) => {
      if (userId) {
         try {
            await completeOnboarding(userId, connectedCalendar);
            setShowOnboarding(false);
         } catch (error) {
            console.error('Error completing onboarding:', error);
         }
      }
   };

   // ==================== MINHA VIDA VIEW ====================
   const renderVida = () => {
      const personalAssoc = associations.find(a => a.type === 'personal');

      if (activeTab === 'personal') {
         const personalModules = lifeAreas.filter(m => m.association_id === personalAssoc?.id);

         return (
            <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
               <HeaderGlobal
                  title="Minha Vida"
                  subtitle="LIFE OS"
                  userEmail={userEmail || undefined}
                  onLogout={() => setIsAuthenticated(false)}
                  onNavigateToAICost={() => setCurrentView('ai-cost')}
                  onNavigateToFileSearch={() => setCurrentView('file-search-analytics')}
                  showTabs={true}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
               />

               <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-4">
                  {/* Journey Card */}
                  {userId && (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                     >
                        <JourneyCardCollapsed onClick={() => setCurrentView('journey')} />
                     </motion.div>
                  )}

                  {/* Consciousness Score Card */}
                  {consciousnessStats && !cpLoading && (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                     >
                        <ConsciousnessScore stats={consciousnessStats} size="md" showDetails={true} />
                     </motion.div>
                  )}

                  {/* Life Modules Grid - Bento Style */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Finanças */}
                     {userId ? (
                        <motion.div
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={2}
                           className="col-span-2 row-span-2 cursor-pointer hover:scale-[1.01] transition-transform"
                           onClick={() => setCurrentView('finance')}
                        >
                           <FinanceCard userId={userId} />
                        </motion.div>
                     ) : (
                        <motion.div
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={2}
                        >
                           <ModuleCard
                              moduleId="finance"
                              title="Finanças"
                              icon={Wallet}
                              color="emerald"
                              accentColor="bg-emerald-50 border-emerald-100 text-emerald-600"
                           />
                        </motion.div>
                     )}

                     {/* Grants Module */}
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        className="col-span-2 row-span-2 cursor-pointer hover:scale-[1.01] transition-transform"
                        onClick={() => setCurrentView('grants')}
                     >
                        <GrantsCard
                           activeProjects={grantsActiveProjects}
                           upcomingDeadlines={grantsUpcomingDeadlines}
                           recentProjects={grantsRecentProjects}
                           onOpenModule={() => setCurrentView('grants')}
                           onCreateProject={() => setCurrentView('grants')}
                        />
                     </motion.div>

                     {/* Módulos Secundários - Colapsar quando todos vazios */}
                     {allSecondaryModulesLoaded && allSecondaryModulesEmpty ? (
                        <motion.div
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={4}
                           className="ceramic-card p-6 col-span-2"
                        >
                           <div className="flex items-center gap-3">
                              <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                                 <CheckCircle2 className="w-5 h-5 text-ceramic-accent" />
                              </div>
                              <div>
                                 <p className="font-bold text-ceramic-text-primary">Tudo em equilíbrio</p>
                                 <p className="text-sm text-ceramic-text-secondary">
                                    Saúde, Educação, Jurídico — sem pendências
                                 </p>
                              </div>
                           </div>
                        </motion.div>
                     ) : (
                        <>
                           {/* Saúde & Bem-estar */}
                           <motion.div
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              custom={4}
                           >
                              <ModuleCard
                                 moduleId="health"
                                 title="Saúde"
                                 icon={Heart}
                                 color="orange"
                                 accentColor="bg-orange-50 border-orange-100 text-orange-600"
                                 onTasksLoaded={handleTasksLoaded}
                              />
                           </motion.div>

                           {/* Educação */}
                           <motion.div
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              custom={5}
                           >
                              <ModuleCard
                                 moduleId="education"
                                 title="Educação"
                                 icon={BookOpen}
                                 color="amber"
                                 accentColor="bg-amber-50 border-amber-100 text-amber-600"
                                 onTasksLoaded={handleTasksLoaded}
                              />
                           </motion.div>

                           {/* Jurídico */}
                           <motion.div
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              custom={6}
                           >
                              <ModuleCard
                                 moduleId="legal"
                                 title="Jurídico"
                                 icon={Scale}
                                 color="slate"
                                 accentColor="bg-slate-50 border-slate-100 text-slate-600"
                                 onTasksLoaded={handleTasksLoaded}
                              />
                           </motion.div>
                        </>
                     )}

                     {/* Associações */}
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={7}
                        onClick={() => setActiveTab('network')}
                        className="ceramic-card relative overflow-hidden p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
                     >
                        <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-200 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="ceramic-inset p-2">
                                 <Building2 className="w-5 h-5 text-blue-600" />
                              </div>
                              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Associações</span>
                           </div>
                           <p className="text-sm text-ceramic-text-primary mb-3 font-medium">
                              {associations.filter(a => a.type !== 'personal').length} Conexões Ativas
                           </p>
                           <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium mt-4 group-hover:translate-x-1 transition-transform">
                              <span>Gerenciar Rede</span>
                              <ChevronRight className="w-3 h-3" />
                           </div>
                        </div>
                     </motion.div>

                     {/* Podcast Copilot */}
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={8}
                        onClick={() => setCurrentView('podcast')}
                        className="ceramic-card relative overflow-hidden p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
                     >
                        <Mic className="absolute -right-4 -bottom-4 w-32 h-32 text-purple-200 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="ceramic-inset p-2">
                                 <Mic className="w-5 h-5 text-purple-600" />
                              </div>
                              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Studio</span>
                           </div>
                           <p className="text-sm text-ceramic-text-primary mb-3 font-medium">
                              Podcast Copilot
                           </p>
                           <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium mt-4 group-hover:translate-x-1 transition-transform">
                              <span>Gerar Pauta</span>
                              <ChevronRight className="w-3 h-3" />
                           </div>
                        </div>
                     </motion.div>
                  </div>
               </main>
            </div>
         );
      } else {
         // NETWORK TAB
         const networkAssocs = associations.filter(a => a.type !== 'personal');

         return (
            <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
               <HeaderGlobal
                  title="Minha Vida"
                  subtitle="LIFE OS"
                  userEmail={userEmail || undefined}
                  onLogout={() => setIsAuthenticated(false)}
                  onNavigateToAICost={() => setCurrentView('ai-cost')}
                  onNavigateToFileSearch={() => setCurrentView('file-search-analytics')}
                  showTabs={true}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
               />

               <main className="flex-1 overflow-y-auto pb-40 pt-4">
                  {networkAssocs.length === 0 ? (
                     /* Arquétipos de Conexão quando vazio */
                     <ConnectionArchetypes
                        onSelectArchetype={(archetypeId) => {
                           console.log('[App] Arquétipo selecionado:', archetypeId);
                           setSelectedArchetype(archetypeId);
                           setShowCreateModal(true);
                           // TODO: Abrir modal de criação de associação
                        }}
                        onCreateCustom={() => {
                           console.log('[App] Criar espaço personalizado');
                           setSelectedArchetype(null);
                           setShowCreateModal(true);
                           // TODO: Abrir modal de criação de associação
                        }}
                     />
                  ) : (
                     /* Lista de Associações */
                     <div className="px-6 space-y-4">
                        {/* Create New Association Button */}
                        <button
                           onClick={() => {
                              setSelectedArchetype(null);
                              setShowCreateModal(true);
                           }}
                           className="ceramic-inset w-full p-4 flex items-center justify-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors group"
                        >
                           <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Plus className="w-5 h-5" />
                           </div>
                           <span className="font-bold text-sm">Criar ou Entrar em Associação</span>
                        </button>

                        {networkAssocs.map(assoc => (
                           <div
                              key={assoc.id}
                              onClick={() => handleOpenAssociation(assoc)}
                              className="ceramic-card p-6 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer group"
                           >
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 ceramic-inset flex items-center justify-center">
                                    <Users className="w-6 h-6 text-ceramic-text-primary" />
                                 </div>
                                 <div>
                                    <h3 className="font-bold text-lg text-ceramic-text-primary text-etched">{assoc.name}</h3>
                                    <p className="text-xs text-ceramic-text-secondary font-light">{assoc.description || 'Sem descrição'}</p>
                                 </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-ceramic-text-secondary group-hover:translate-x-1 transition-transform" />
                           </div>
                        ))}
                     </div>
                  )}
               </main>
            </div>
         );
      }
   };

   // ==================== MEU DIA (AGENDA) VIEW ====================
   const renderAgenda = () => (
      userId ? (
         <AgendaView
            userId={userId}
            userEmail={userEmail || undefined}
            onLogout={() => setIsAuthenticated(false)}
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



   // ==================== PODCAST VIEW ====================
   const renderPodcast = () => (
      <PodcastCopilotView
         userEmail={userEmail || undefined}
         onLogout={() => setIsAuthenticated(false)}
         onExit={() => setCurrentView('vida')}
         onNavVisibilityChange={setShowPodcastNav}
      />
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
   const renderMainApp = () => (
      <div className="bg-ceramic-base min-h-screen font-sans text-ceramic-text-primary">
         {currentView === 'vida' && renderVida()}
         {currentView === 'agenda' && renderAgenda()}
         {currentView === 'association_detail' && renderAssociationDetail()}
         {currentView === 'podcast' && renderPodcast()}
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

         {currentView !== 'association_detail' && currentView !== 'finance' && currentView !== 'finance_agent' && currentView !== 'grants' && currentView !== 'ai-cost' && currentView !== 'file-search-analytics' && (currentView !== 'podcast' || showPodcastNav) &&
            <BottomNav
               currentView={currentView}
               onChange={setCurrentView}
               onMicClick={() => alert('Voice AI Coming Soon')}
               isListening={false}
            />
         }

         {/* New Onboarding Flow */}
         {!checkingOnboarding && showOnboarding && userId && (
            <OnboardingFlow
               userId={userId}
               onComplete={() => handleOnboardingComplete(false)}
               onError={(error) => {
                  console.error('Onboarding error:', error);
                  // In production, show error notification
               }}
            />
         )}

         {/* Notification Toast Container */}
         <NotificationContainer />
      </div>
   );

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

   // Use React Router Routes to ensure proper Router context for all components
   return (
      <Routes>
         {/* Guest Approval Page - Public route for podcast guests */}
         <Route
            path="/guest-approval/:episodeId/:approvalToken"
            element={<GuestApprovalPage />}
         />

         {/* Landing Page - Unauthenticated users */}
         <Route
            path="/landing"
            element={<LandingPage />}
         />

         {/* Main App - Authenticated users */}
         <Route
            path="/*"
            element={isAuthenticated ? renderMainApp() : <Navigate to="/landing" replace />}
         />
      </Routes>
   );
}

