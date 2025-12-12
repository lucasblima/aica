import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Wallet, Heart, Users, Building2, BookOpen, Scale, CheckCircle2, Mic, Plus } from 'lucide-react';
import { HeaderGlobal } from '../components/HeaderGlobal';
import { EfficiencyTrendChart } from '../components/EfficiencyTrendChart';
import { JourneyCardCollapsed } from '../modules/journey/views/JourneyCardCollapsed';
import { ConnectionArchetypes } from '../components/ConnectionArchetypes';
import { ConsciousnessScore } from '../modules/journey/components/gamification/ConsciousnessScore';
import { useConsciousnessPoints } from '../modules/journey/hooks/useConsciousnessPoints';
import { FinanceCard } from '../modules/finance/components/FinanceCard';
import { GrantsCard } from '../modules/grants/components/GrantsCard';
import { getModuleTasks } from '../services/supabaseService';
import { getUpcomingDeadlines, countAllActiveProjects, getRecentProjects } from '../modules/grants/services/grantService';
import type { GrantDeadline, GrantProject } from '../modules/grants/types';
import { ViewState } from '../../types';

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

// Reusable Module Card Component
const ModuleCard = ({ moduleId, title, icon: Icon, color, accentColor, onTasksLoaded }: any) => {
   const [tasks, setTasks] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      getModuleTasks(moduleId).then(data => {
         setTasks(data);
         setLoading(false);
         onTasksLoaded?.(moduleId, data.length);
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
   const [activeTab, setActiveTab] = useState<TabState>('personal');
   const [modulesStatus, setModulesStatus] = useState<Record<string, number>>({});

   // Consciousness Points State
   const { stats: consciousnessStats, isLoading: cpLoading } = useConsciousnessPoints();

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
               showTabs={true}
               activeTab={activeTab}
               onTabChange={setActiveTab}
            />

            <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-4">
               {/* Journey Card */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
               >
                  <JourneyCardCollapsed onClick={() => onNavigateToView('journey')} />
               </motion.div>

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

               {/* Efficiency Trend Chart */}
               {userId && (
                  <motion.div
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={2}
                  >
                     <EfficiencyTrendChart userId={userId} days={30} />
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
                        custom={3}
                        className="col-span-2 row-span-2 cursor-pointer hover:scale-[1.01] transition-transform"
                        onClick={() => onNavigateToView('finance')}
                     >
                        <FinanceCard userId={userId} />
                     </motion.div>
                  ) : (
                     <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
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
                     custom={4}
                     className="col-span-2 row-span-2 cursor-pointer hover:scale-[1.01] transition-transform"
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
                     onClick={() => onNavigateToView('podcast')}
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
               onLogout={onLogout}
               onNavigateToAICost={onNavigateToAICost}
               onNavigateToFileSearch={onNavigateToFileSearch}
               showTabs={true}
               activeTab={activeTab}
               onTabChange={setActiveTab}
            />

            <main className="flex-1 overflow-y-auto pb-40 pt-4">
               {networkAssocs.length === 0 ? (
                  /* Arquétipos de Conexão quando vazio */
                  <ConnectionArchetypes
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
                        <span className="font-bold text-sm">Criar ou Entrar em Associação</span>
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
}
