import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Wallet, Heart, Users, Building2, BookOpen, Scale, CheckCircle2, Mic, Plus } from 'lucide-react';
import { HeaderGlobal } from '../components/HeaderGlobal';
import { IdentityPassport } from '../components/IdentityPassport';
import { ProfileModal } from '../components/ProfileModal';
import { ConnectionArchetypes } from '../components/ConnectionArchetypes';
import { FinanceCard } from '../modules/finance/components/FinanceCard';
import { GrantsCard } from '../modules/grants/components/GrantsCard';
import { ModuleCard } from '../components/ModuleCard';
import { useConsciousnessPoints } from '../modules/journey/hooks/useConsciousnessPoints';
import { getUpcomingDeadlines, countAllActiveProjects, getRecentProjects } from '../modules/grants/services/grantService';
import type { GrantDeadline, GrantProject } from '../modules/grants/types';
import { ViewState } from '../../types';
import { supabase } from '../lib/supabase';

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
   const [isProfileModalOpen, setProfileModalOpen] = useState(false);

   // Get CP stats for streak integration
   const { stats: cpStats } = useConsciousnessPoints();

   // Handle account deletion
   const handleDeleteAccount = async () => {
      try {
         // Sign out and redirect
         await supabase.auth.signOut();
         window.location.href = '/';
      } catch (error) {
         console.error('Error deleting account:', error);
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

            console.log('[Home] Grants data loaded:', { activeCount, deadlines: deadlines.length, recent: recent.length });
         } catch (error) {
            console.error('Error loading grants data:', error);
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
               onLogout={onLogout}
               onNavigateToAICost={onNavigateToAICost}
               onNavigateToFileSearch={onNavigateToFileSearch}
               showTabs={false}
               activeTab={activeTab}
               onTabChange={handleTabChange}
            />

            <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-8">
               {/* 1. Identity Passport - Full Width Hero with Streak Badge */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  className="relative"
               >
                  <IdentityPassport
                     userId={userId}
                     onOpenProfile={() => setProfileModalOpen(true)}
                  />
                  {/* GAP 5: Streak Badge - Minimalista */}
                  <motion.div
                     className="absolute top-4 right-4 sm:top-6 sm:right-6"
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.3, duration: 0.4, type: 'spring', stiffness: 200 }}
                  >
                     <div className="ceramic-inset-sm px-3 py-1 flex items-center gap-2">
                        <span className="text-base">🔥</span>
                        <span className="text-amber-600 text-xs font-bold">{cpStats?.current_streak || 0} dias</span>
                     </div>
                  </motion.div>
               </motion.div>


               {/* GAP 6: Life Modules Grid - Minimalista Ícones */}
               <div className="space-y-6">
                  {/* Primary Modules: Finance & Grants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                     {/* Finanças */}
                     {userId ? (
                        <motion.div
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={2}
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

                  {/* Secondary Modules - Minimalst Icon Grid */}
                  {allSecondaryModulesLoaded && allSecondaryModulesEmpty ? (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        className="ceramic-card p-5 min-h-[120px] flex items-center justify-center"
                     >
                        <div className="flex items-center gap-3">
                           <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-ceramic-accent" />
                           </div>
                           <div>
                              <p className="font-bold text-ceramic-text-primary">Tudo em equilíbrio</p>
                              <p className="text-sm text-ceramic-text-secondary">Sem pendências</p>
                           </div>
                        </div>
                     </motion.div>
                  ) : (
                     <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Saúde */}
                        <motion.button
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={4}
                           onClick={() => onNavigateToView('health')}
                           className="ceramic-card-flat p-4 flex flex-col items-center gap-2 hover:ceramic-elevated transition-all duration-300 active:scale-95"
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.98 }}
                        >
                           <div className="text-4xl sm:text-3xl">🫀</div>
                           <span className="text-xs text-ceramic-text-secondary font-medium text-center">Saúde</span>
                        </motion.button>

                        {/* Educação */}
                        <motion.button
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={5}
                           onClick={() => onNavigateToView('education')}
                           className="ceramic-card-flat p-4 flex flex-col items-center gap-2 hover:ceramic-elevated transition-all duration-300 active:scale-95"
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.98 }}
                        >
                           <div className="text-4xl sm:text-3xl">📚</div>
                           <span className="text-xs text-ceramic-text-secondary font-medium text-center">Educação</span>
                        </motion.button>

                        {/* Jurídico */}
                        <motion.button
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={6}
                           onClick={() => onNavigateToView('legal')}
                           className="ceramic-card-flat p-4 flex flex-col items-center gap-2 hover:ceramic-elevated transition-all duration-300 active:scale-95"
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.98 }}
                        >
                           <div className="text-4xl sm:text-3xl">⚖️</div>
                           <span className="text-xs text-ceramic-text-secondary font-medium text-center">Jurídico</span>
                        </motion.button>

                        {/* Profissional - Hidden on mobile, visible on lg */}
                        <motion.button
                           variants={cardVariants}
                           initial="hidden"
                           animate="visible"
                           custom={7}
                           onClick={() => onNavigateToView('professional')}
                           className="hidden lg:flex ceramic-card-flat p-4 flex-col items-center gap-2 hover:ceramic-elevated transition-all duration-300 active:scale-95"
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.98 }}
                        >
                           <div className="text-4xl sm:text-3xl">💼</div>
                           <span className="text-xs text-ceramic-text-secondary font-medium text-center">Profissional</span>
                        </motion.button>
                     </div>
                  )}
               </div>

               {/* Network & Podcast Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Associações */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={8}
                     onClick={() => setActiveTab('network')}
                     className="ceramic-card relative overflow-hidden p-5 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
                  >
                     <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-200 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="ceramic-inset p-2">
                              <Building2 className="w-5 h-5 text-blue-600" />
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Rede</span>
                        </div>
                        <p className="text-sm text-ceramic-text-primary mb-3 font-medium flex-1">
                           {associations.filter(a => a.type !== 'personal').length} Conexões
                        </p>
                        <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium group-hover:translate-x-1 transition-transform">
                           <span>Ver</span>
                           <ChevronRight className="w-3 h-3" />
                        </div>
                     </div>
                  </motion.div>

                  {/* Podcast Copilot */}
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={9}
                     onClick={() => onNavigateToView('podcast')}
                     className="ceramic-card relative overflow-hidden p-5 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
                  >
                     <Mic className="absolute -right-4 -bottom-4 w-32 h-32 text-purple-200 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="ceramic-inset p-2">
                              <Mic className="w-5 h-5 text-purple-600" />
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Studio</span>
                        </div>
                        <p className="text-sm text-ceramic-text-primary mb-3 font-medium flex-1">
                           Podcast
                        </p>
                        <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium group-hover:translate-x-1 transition-transform">
                           <span>Gerar</span>
                           <ChevronRight className="w-3 h-3" />
                        </div>
                     </div>
                  </motion.div>
               </div>
            </main>

            {/* Profile Modal */}
            <ProfileModal
               isOpen={isProfileModalOpen}
               onClose={() => setProfileModalOpen(false)}
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
               onLogout={onLogout}
               onNavigateToAICost={onNavigateToAICost}
               onNavigateToFileSearch={onNavigateToFileSearch}
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
                        console.log('[Home] Arquétipo selecionado:', archetypeId);
                        onSelectArchetype(archetypeId);
                     }}
                     onCreateCustom={() => {
                        console.log('[Home] Criar espaço personalizado');
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
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
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
