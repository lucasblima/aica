import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Wallet, Heart, Users, Building2, BookOpen, Scale, CheckCircle2, Mic, Plus, Briefcase } from 'lucide-react';
import { HeaderGlobal, ProfileDrawer, ConnectionArchetypes, ModuleCard } from '../components';
import { FinanceCard } from '../modules/finance/components/FinanceCard';
import { GrantsCard } from '../modules/grants/components/GrantsCard';
import { JourneyHeroCard } from '../modules/journey';
import { FluxCard } from '../modules/flux';
import { RecentContactsWidget } from '../components';
import { getUpcomingDeadlines, countAllActiveProjects, getRecentProjects } from '../modules/grants/services/grantService';
import type { GrantDeadline, GrantProject } from '../modules/grants/types';
import { ViewState } from '../../types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Home');

// Types
type TabState = 'personal' | 'network';

// Animation variants for card entrance choreography
const cardVariants = {
   hidden: {
      opacity: 0,
      y: 20,
      rotateX: -5,
      scale: 0.98
   },
   visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: {
         delay: i * 0.08,
         duration: 0.5,
         ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
      }
   })
};

interface HomeProps {
   userId: string;
   userEmail: string | null;
   associations: any[];
   lifeAreas: any[];
   onLogout: () => void;
   onNavigateToView: (view: ViewState) => void;
   onNavigateToAICost: () => void;
   onNavigateToFileSearch: () => void;
   onOpenAssociation: (assoc: any) => void;
   onSelectArchetype: (archetypeId: string | null) => void;
   onCreateAssociation: () => void;
}

interface LifeArea {
   id: string;
   label: string;
   icon: string;
   route: ViewState;
}

// Life Areas configuration for minimalst grid
const LIFE_AREAS: LifeArea[] = [
   { id: 'finance', label: 'Finanças', icon: '💰', route: 'finance' },
   { id: 'health', label: 'Saúde', icon: '🫀', route: 'health' },
   { id: 'education', label: 'Educação', icon: '📚', route: 'education' },
   { id: 'legal', label: 'Jurídico', icon: '⚖️', route: 'legal' },
   { id: 'professional', label: 'Profissional', icon: '💼', route: 'professional' },
   { id: 'relationships', label: 'Relacionamentos', icon: '💝', route: 'relationships' },
];

export default function Home({
   userId,
   userEmail,
   associations,
   lifeAreas,
   onLogout,
   onNavigateToView,
   onNavigateToAICost,
   onNavigateToFileSearch,
   onOpenAssociation,
   onSelectArchetype,
   onCreateAssociation
}: HomeProps) {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [activeTab, setActiveTab] = useState<TabState>('personal');

   // Handle tab change - navigate to /connections for network tab
   const handleTabChange = (tab: TabState) => {
      if (tab === 'network') {
         navigate('/connections');
      } else {
         setActiveTab(tab);
      }
   };
   const [modulesStatus, setModulesStatus] = useState<Record<string, number>>({});
   const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);

   // User metadata for avatar and profile
   const avatarUrl = useMemo(() => user?.user_metadata?.avatar_url, [user]);
   const userName = useMemo(() => {
      if (!user) return undefined;
      return user.user_metadata?.full_name || user.email?.split('@')[0];
   }, [user]);

   // Reset ProfileDrawer when component unmounts (prevents drawer persisting across views)
   useEffect(() => {
      return () => {
         setProfileDrawerOpen(false);
      };
   }, []);

   // Handle account deletion
   const handleDeleteAccount = async () => {
      try {
         // Sign out and redirect
         await supabase.auth.signOut();
         window.location.href = '/';
      } catch (error) {
         log.error('Error deleting account:', error);
         throw error;
      }
   };

   // Grants Card State
   const [grantsActiveProjects, setGrantsActiveProjects] = useState<number>(0);
   const [grantsUpcomingDeadlines, setGrantsUpcomingDeadlines] = useState<GrantDeadline[]>([]);
   const [grantsRecentProjects, setGrantsRecentProjects] = useState<GrantProject[]>([]);

   const handleTasksLoaded = useCallback((moduleId: string, taskCount: number) => {
      setModulesStatus(prev => ({ ...prev, [moduleId]: taskCount }));
   }, []);

   const secondaryModules = ['health', 'education', 'legal'];
   const allSecondaryModulesEmpty = secondaryModules.every(
      moduleId => modulesStatus[moduleId] === 0
   );
   const allSecondaryModulesLoaded = secondaryModules.every(
      moduleId => modulesStatus[moduleId] !== undefined
   );

   // Load Grants Card data
   useEffect(() => {
      const loadGrantsData = async () => {
         try {
            const activeCount = await countAllActiveProjects();
            setGrantsActiveProjects(activeCount);

            const deadlines = await getUpcomingDeadlines(30);
            setGrantsUpcomingDeadlines(deadlines);

            const recent = await getRecentProjects(2);
            setGrantsRecentProjects(recent);

            log.debug(' Grants data loaded:', { activeCount, deadlines: deadlines.length, recent: recent.length });
         } catch (error) {
            log.error('Error loading grants data:', error);
         }
      };

      loadGrantsData();
   }, []);

   const personalAssoc = associations.find(a => a.type === 'personal');

   if (activeTab === 'personal') {
      return (
         <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
            <HeaderGlobal
               title="Minha Vida"
               subtitle="LIFE OS"
               userEmail={userEmail || undefined}
               avatarUrl={avatarUrl}
               userName={userName}
               onLogout={onLogout}
               onNavigateToAICost={onNavigateToAICost}
               onNavigateToFileSearch={onNavigateToFileSearch}
               onOpenProfile={() => setProfileDrawerOpen(true)}
               showTabs={false}
               activeTab={activeTab}
               onTabChange={handleTabChange}
            />

            <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-8">
               {/* 1. Journey Hero Card - Unified Identity + Journey Preview */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
               >
                  <JourneyHeroCard
                     onOpenProfile={() => {
                        log.debug(' JourneyHeroCard onOpenProfile clicked');
                        setProfileDrawerOpen(true);
                     }}
                     onOpenJourney={() => {
                        log.debug(' JourneyHeroCard onOpenJourney clicked');
                        onNavigateToView('journey');
                     }}
                  />
               </motion.div>


               {/* Life Modules Grid - Essencial (Vida Pessoal + Profissional + Financeiro) */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Saúde */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={1}
                     onClick={() => onNavigateToView('health')}
                  >
                     <ModuleCard
                        moduleId="health"
                        title="Saúde"
                        icon={Heart}
                        color="orange"
                        accentColor="bg-ceramic-warning/10 border-ceramic-warning/20 text-ceramic-warning"
                     />
                  </motion.div>

                  {/* Educação */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={2}
                     onClick={() => onNavigateToView('education')}
                  >
                     <ModuleCard
                        moduleId="education"
                        title="Educação"
                        icon={BookOpen}
                        color="blue"
                        accentColor="bg-ceramic-info/10 border-ceramic-info/20 text-ceramic-info"
                     />
                  </motion.div>

                  {/* Profissional */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={3}
                     onClick={() => onNavigateToView('professional')}
                  >
                     <ModuleCard
                        moduleId="professional"
                        title="Profissional"
                        icon={Briefcase}
                        color="indigo"
                        accentColor="bg-ceramic-accent/10 border-ceramic-accent/20 text-ceramic-accent"
                     />
                  </motion.div>

                  {/* Jurídico */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={4}
                     onClick={() => onNavigateToView('legal')}
                  >
                     <ModuleCard
                        moduleId="legal"
                        title="Jurídico"
                        icon={Scale}
                        color="slate"
                        accentColor="bg-ceramic-text-secondary/10 border-ceramic-text-secondary/20 text-ceramic-text-secondary"
                     />
                  </motion.div>

                  {/* Finanças */}
                  {userId ? (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        className="cursor-pointer hover:scale-[1.01] transition-transform"
                        onClick={() => onNavigateToView('finance')}
                     >
                        <FinanceCard userId={userId} />
                     </motion.div>
                  ) : (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        onClick={() => onNavigateToView('finance')}
                     >
                        <ModuleCard
                           moduleId="finance"
                           title="Finanças"
                           icon={Wallet}
                           color="emerald"
                           accentColor="bg-ceramic-success/10 border-ceramic-success/20 text-ceramic-success"
                        />
                     </motion.div>
                  )}

                  {/* Captação (Grants) */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={6}
                     className="cursor-pointer hover:scale-[1.01] transition-transform"
                     onClick={() => onNavigateToView('grants')}
                  >
                     <GrantsCard
                        activeProjects={grantsActiveProjects}
                        upcomingDeadlines={grantsUpcomingDeadlines}
                        recentProjects={grantsRecentProjects}
                        onOpenModule={() => onNavigateToView('grants')}
                        onCreateProject={() => onNavigateToView('grants')}
                     />
                  </motion.div>
               </div>

               {/* Recent Contacts Widget - Full Width (Conexões são muito importantes) */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={7}
               >
                  <RecentContactsWidget
                     onViewAllClick={() => navigate('/contacts')}
                     onContactClick={(contact) => log.debug('Contact clicked:', contact)}
                  />
               </motion.div>

               {/* Rede/Associações - Full Width (Conexões são muito importantes) */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={8}
                  onClick={() => onNavigateToView('connections')}
                  className="ceramic-card relative overflow-hidden p-5 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
               >
                  <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-ceramic-info opacity-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="ceramic-inset p-2">
                           <Building2 className="w-5 h-5 text-ceramic-info" />
                        </div>
                        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Rede</span>
                     </div>
                     {associations.filter(a => a.type !== 'personal').length === 0 ? (
                        <div className="flex-1 flex flex-col justify-center space-y-3">
                           <div>
                              <p className="text-sm font-bold text-ceramic-text-primary mb-1">
                                 Mapeie seus relacionamentos
                              </p>
                              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                                 Organize suas conexões em 4 arquétipos: Habitat, Ventures, Academia e Tribo
                              </p>
                           </div>
                        </div>
                     ) : (
                        <p className="text-sm text-ceramic-text-primary mb-3 font-medium flex-1">
                           {associations.filter(a => a.type !== 'personal').length} Conexões
                        </p>
                     )}
                     <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium group-hover:translate-x-1 transition-transform">
                        <span>{associations.filter(a => a.type !== 'personal').length === 0 ? 'Começar' : 'Ver'}</span>
                        <ChevronRight className="w-3 h-3" />
                     </div>
                  </div>
               </motion.div>

               {/* Premium Modules Grid (Studio + Flux) */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Podcast Copilot */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={9}
                     onClick={() => onNavigateToView('studio')}
                     className="ceramic-card relative overflow-hidden p-5 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
                     style={{
                        background: 'linear-gradient(135deg, #F0EFE9 0%, #F5E6F0 100%)'
                     }}
                  >
                     <Mic className="absolute -right-4 -bottom-4 w-32 h-32 text-ceramic-warning opacity-10 group-hover:scale-110 transition-transform duration-500" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="ceramic-inset p-2">
                              <Mic className="w-5 h-5 text-ceramic-warning" />
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Studio</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center space-y-3">
                           <div>
                              <p className="text-sm font-bold text-ceramic-text-primary mb-1">
                                 Podcast Copilot
                              </p>
                              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                                 Transforme suas reflexoes em episodios de podcast
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium group-hover:translate-x-1 transition-transform">
                           <span>Gerar</span>
                           <ChevronRight className="w-3 h-3" />
                        </div>
                     </div>
                  </motion.div>

                  {/* Flux - Training Management Mini Dashboard */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={10}
                  >
                     <FluxCard />
                  </motion.div>
               </div>
            </main>

            {/* Profile Drawer */}
            <ProfileDrawer
               isOpen={isProfileDrawerOpen}
               onClose={() => setProfileDrawerOpen(false)}
               userId={userId}
               userEmail={userEmail || ''}
               onDeleteAccount={handleDeleteAccount}
            />
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
               avatarUrl={avatarUrl}
               userName={userName}
               onLogout={onLogout}
               onNavigateToAICost={onNavigateToAICost}
               onNavigateToFileSearch={onNavigateToFileSearch}
               onOpenProfile={() => setProfileDrawerOpen(true)}
               showTabs={false}
               activeTab={activeTab}
               onTabChange={handleTabChange}
            />

            <main className="flex-1 overflow-y-auto pb-40 pt-4">
               {networkAssocs.length === 0 ? (
                  /* Arquétipos de Conexão quando vazio */
                  <ConnectionArchetypes
                     multiSelect={false}
                     onSelectArchetype={(archetypeId) => {
                        log.debug(' Arquétipo selecionado:', archetypeId);
                        onSelectArchetype(archetypeId);
                     }}
                     onCreateCustom={() => {
                        log.debug(' Criar espaço personalizado');
                        onSelectArchetype(null);
                     }}
                  />
               ) : (
                  /* Lista de Associações */
                  <div className="px-6 space-y-4">
                     {/* Create New Association Button */}
                     <button
                        onClick={onCreateAssociation}
                        className="ceramic-inset w-full p-4 flex items-center justify-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors group"
                     >
                        <div className="w-8 h-8 rounded-full bg-ceramic-base/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                           <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">Nova Associação</span>
                     </button>

                     {networkAssocs.map(assoc => (
                        <div
                           key={assoc.id}
                           onClick={() => onOpenAssociation(assoc)}
                           className="ceramic-card p-6 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer group"
                        >
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 ceramic-inset flex items-center justify-center">
                                 <Users className="w-6 h-6 text-ceramic-text-primary" />
                              </div>
                              <div>
                                 <h3 className="font-bold text-lg text-ceramic-text-primary text-etched">{assoc.name}</h3>
                                 <p className="text-xs text-ceramic-text-secondary font-light">{assoc.description || ''}</p>
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
}
