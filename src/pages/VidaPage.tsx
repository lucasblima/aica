/**
 * VidaPage — Central hub of AICA Life OS
 *
 * Home.tsx quality + inline chat hero.
 * Accepts same props as Home for ViewState system compatibility.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Heart, Building2, BookOpen, Scale, Mic, Briefcase, Ticket, Compass, Flame, Zap, TrendingUp, type LucideIcon } from 'lucide-react';
import { HeaderGlobal, ProfileDrawer, ModuleCard, ExploreMoreSection, CreditBalanceWidget, InviteShareCard, InviteModal } from '../components';
import { VidaChatHero } from '@/components/features/VidaChatHero';
import { LifeCouncilCard, PatternsSummary } from '@/components/features';
import { FinanceCard } from '../modules/finance/components/FinanceCard';
import { GrantsCard } from '../modules/grants/components/GrantsCard';
import { JourneyHeroCard } from '../modules/journey';
import { FluxCard } from '../modules/flux';
import { InterviewerCard } from '../modules/journey/components/interviewer';
import { useConsciousnessPoints } from '../modules/journey/hooks/useConsciousnessPoints';
import { LEVEL_COLORS } from '../modules/journey/types/consciousnessPoints';
import { useLifeCouncil } from '@/hooks/useLifeCouncil';
import { useUserPatterns } from '@/hooks/useUserPatterns';
import { useGrantsHomeQuery } from '@/hooks/queries';
import { ViewState } from '../../types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';

const log = createNamespacedLogger('VidaPage');

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

// MODULE_REGISTRY — typed config for all modules
interface ModuleConfig {
   id: string;
   label: string;
   icon: string;
   route: ViewState | string;
   type: 'core' | 'generic';
}

const MODULE_REGISTRY: ModuleConfig[] = [
   { id: 'finance', label: 'Finanças', icon: '💰', route: 'finance', type: 'core' },
   { id: 'grants', label: 'Captação', icon: '📄', route: 'grants', type: 'core' },
   { id: 'flux', label: 'Flux', icon: '🏋️', route: 'flux', type: 'core' },
   { id: 'studio', label: 'Studio', icon: '🎙️', route: 'studio', type: 'core' },
   { id: 'connections', label: 'Conexões', icon: '🏢', route: 'connections', type: 'core' },
   { id: 'eraforge', label: 'EraForge', icon: '🏛️', route: 'eraforge', type: 'core' },
   { id: 'health', label: 'Saúde', icon: '🫀', route: 'health', type: 'generic' },
   { id: 'education', label: 'Educação', icon: '📚', route: 'education', type: 'generic' },
   { id: 'professional', label: 'Profissional', icon: '💼', route: 'professional', type: 'generic' },
   { id: 'legal', label: 'Jurídico', icon: '⚖️', route: 'legal', type: 'generic' },
];

interface VidaPageProps {
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

export default function VidaPage({
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
}: VidaPageProps) {
   const navigate = useNavigate();
   const { user } = useAuth();

   const [modulesStatus, setModulesStatus] = useState<Record<string, number>>({});
   const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);
   const [isInviteModalOpen, setInviteModalOpen] = useState(false);

   // Identity data from Journey CP system
   const { stats: cpStats, progress: cpProgress } = useConsciousnessPoints();

   // Life Council — auto-trigger daily insight generation
   const council = useLifeCouncil({ autoTrigger: true });

   // User Patterns — behavioral patterns from OpenClaw
   const userPatterns = useUserPatterns();

   // User metadata for avatar and profile
   const avatarUrl = useMemo(() => user?.user_metadata?.avatar_url, [user]);
   const userName = useMemo(() => {
      if (!user) return undefined;
      return user.user_metadata?.full_name || user.email?.split('@')[0];
   }, [user]);

   const levelColor = useMemo(() => {
      if (!cpStats) return undefined;
      return LEVEL_COLORS[cpStats.level];
   }, [cpStats]);

   const progressPercentage = useMemo(() => {
      if (!cpProgress) return 0;
      return cpProgress.progress_percentage || 0;
   }, [cpProgress]);

   useEffect(() => {
      return () => { setProfileDrawerOpen(false); };
   }, []);

   const handleDeleteAccount = async () => {
      try {
         await supabase.auth.signOut();
         window.location.href = '/';
      } catch (error) {
         log.error('Error deleting account:', error);
         throw error;
      }
   };

   // Grants Card data via React Query
   const { data: grantsData } = useGrantsHomeQuery(!!userId);
   const grantsActiveProjects = grantsData?.activeProjects ?? 0;
   const grantsUpcomingDeadlines = grantsData?.upcomingDeadlines ?? [];
   const grantsRecentProjects = grantsData?.recentProjects ?? [];

   const handleTasksLoaded = useCallback((moduleId: string, taskCount: number) => {
      setModulesStatus(prev => ({ ...prev, [moduleId]: taskCount }));
   }, []);

   const genericModules = MODULE_REGISTRY.filter(m => m.type === 'generic');
   const activeGenericModules = genericModules.filter(m => (modulesStatus[m.id] || 0) > 0);
   const inactiveModules = genericModules.filter(m => !modulesStatus[m.id] || modulesStatus[m.id] === 0);

   const connectionCount = associations.filter(a => a.type !== 'personal').length;

   const ICON_MAP: Record<string, LucideIcon> = {
      health: Heart,
      education: BookOpen,
      professional: Briefcase,
      legal: Scale,
   };

   const ACCENT_MAP: Record<string, string> = {
      health: 'bg-ceramic-warning/10 border-ceramic-warning/20 text-ceramic-warning',
      education: 'bg-ceramic-info/10 border-ceramic-info/20 text-ceramic-info',
      professional: 'bg-ceramic-accent/10 border-ceramic-accent/20 text-ceramic-accent',
      legal: 'bg-ceramic-text-secondary/10 border-ceramic-text-secondary/20 text-ceramic-text-secondary',
   };

   let cardIndex = 1; // Journey is 0

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
            level={cpStats?.level}
            levelName={cpStats?.level_name}
            levelColor={levelColor}
            progressPercentage={progressPercentage}
            totalPoints={cpStats?.total_points || 0}
            currentStreak={cpStats?.current_streak || 0}
            onAvatarClick={() => setProfileDrawerOpen(true)}
         />

         {/* Credit Balance - compact inline */}
         {userId && (
            <div className="px-6 pt-3 flex justify-end">
               <CreditBalanceWidget compact showStats={false} />
            </div>
         )}

         <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-4">
            {/* Chat Hero — inline chat with expand/collapse */}
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4 }}
            >
               <VidaChatHero />
            </motion.div>

            {/* Quick Stats — real-time user data */}
            {cpStats && (
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="grid grid-cols-3 gap-2"
               >
                  <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-3 flex items-center gap-2.5">
                     <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-amber-500" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-lg font-bold text-ceramic-text-primary leading-tight">
                           {cpStats.total_points || 0}
                        </p>
                        <p className="text-[10px] text-ceramic-text-secondary truncate">Total CP</p>
                     </div>
                  </div>
                  <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-3 flex items-center gap-2.5">
                     <div className="w-8 h-8 rounded-lg bg-ceramic-warning/10 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4 text-ceramic-warning" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-lg font-bold text-ceramic-text-primary leading-tight">
                           {cpStats.current_streak || 0}
                        </p>
                        <p className="text-[10px] text-ceramic-text-secondary truncate">Streak</p>
                     </div>
                  </div>
                  <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-3 flex items-center gap-2.5">
                     <div className="w-8 h-8 rounded-lg bg-ceramic-info/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-ceramic-info" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-lg font-bold text-ceramic-text-primary leading-tight">
                           {cpStats.total_moments || 0}
                        </p>
                        <p className="text-[10px] text-ceramic-text-secondary truncate">Momentos</p>
                     </div>
                  </div>
               </motion.div>
            )}

            {/* Life Council — AI daily insight */}
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.15 }}
            >
               <LifeCouncilCard
                  insight={council.insight}
                  isLoading={council.isLoading}
                  isRunning={council.isRunning}
                  error={council.error}
                  onRun={council.runCouncil}
                  onMarkViewed={council.markViewed}
                  compact
                  onViewMore={() => onNavigateToView('journey')}
                  lastUpdated={council.insight?.insight_date}
               />
            </motion.div>

            {/* Behavioral Patterns — compact */}
            {(userPatterns.isLoading || userPatterns.patterns.length > 0) && (
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
               >
                  <PatternsSummary
                     patterns={userPatterns.patterns}
                     isLoading={userPatterns.isLoading}
                     isSynthesizing={userPatterns.isSynthesizing}
                     error={userPatterns.error}
                     onSynthesize={userPatterns.synthesize}
                     compact
                     onViewMore={() => onNavigateToView('journey')}
                     lastUpdated={userPatterns.lastSynthesizedAt}
                  />
               </motion.div>
            )}

            {/* Journey CTA — full width */}
            <motion.div
               variants={cardVariants}
               initial="hidden"
               animate="visible"
               custom={0}
            >
               <JourneyHeroCard
                  onOpenJourney={() => onNavigateToView('journey')}
                  stats={cpStats}
               />
            </motion.div>

            {/* Module cards grid — all compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
               {/* Finance */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  className="cursor-pointer"
                  onClick={() => onNavigateToView('finance')}
               >
                  {userId ? (
                     <FinanceCard userId={userId} compact />
                  ) : (
                     <ModuleCard
                        moduleId="finance"
                        title="Finanças"
                        icon={Wallet}
                        color="emerald"
                        accentColor="bg-ceramic-success/10 border-ceramic-success/20 text-ceramic-success"
                        compact
                     />
                  )}
               </motion.div>

               {/* Grants */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  className="cursor-pointer"
                  onClick={() => onNavigateToView('grants')}
               >
                  <GrantsCard
                     activeProjects={grantsActiveProjects}
                     upcomingDeadlines={grantsUpcomingDeadlines}
                     recentProjects={grantsRecentProjects}
                     onOpenModule={() => onNavigateToView('grants')}
                     onCreateProject={() => onNavigateToView('grants')}
                     compact
                  />
               </motion.div>

               {/* Flux */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
               >
                  <FluxCard compact />
               </motion.div>

               {/* Studio */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  onClick={() => onNavigateToView('studio')}
                  className="cursor-pointer"
               >
                  <motion.div
                     className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group"
                     style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #F5E6F0 100%)' }}
                     variants={cardElevationVariants}
                     initial="rest"
                     whileHover="hover"
                     whileTap="pressed"
                  >
                     <Mic className="absolute -right-2 -bottom-2 w-20 h-20 text-ceramic-warning opacity-10" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="ceramic-inset p-1.5">
                              <Mic className="w-4 h-4 text-ceramic-warning" />
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Studio</span>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary line-clamp-1">Podcast Copilot</p>
                     </div>
                  </motion.div>
               </motion.div>

               {/* Connections */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  onClick={() => onNavigateToView('connections')}
                  className="cursor-pointer"
               >
                  <motion.div
                     className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group"
                     variants={cardElevationVariants}
                     initial="rest"
                     whileHover="hover"
                     whileTap="pressed"
                  >
                     <Building2 className="absolute -right-2 -bottom-2 w-20 h-20 text-ceramic-info opacity-10" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <div className="ceramic-inset p-1.5">
                                 <Building2 className="w-4 h-4 text-ceramic-info" />
                              </div>
                              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Rede</span>
                           </div>
                           {connectionCount > 0 && (
                              <div className="ceramic-inset px-2 py-0.5 rounded-full">
                                 <span className="text-[10px] font-bold text-ceramic-info">{connectionCount}</span>
                              </div>
                           )}
                        </div>
                        <p className="text-xs text-ceramic-text-secondary line-clamp-1">
                           {connectionCount === 0 ? 'Mapeie seus relacionamentos' : `${connectionCount} conexões`}
                        </p>
                     </div>
                  </motion.div>
               </motion.div>

               {/* Convites */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  onClick={() => navigate('/invites')}
                  className="cursor-pointer"
               >
                  <motion.div
                     className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group"
                     style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #FEF3C7 100%)' }}
                     variants={cardElevationVariants}
                     initial="rest"
                     whileHover="hover"
                     whileTap="pressed"
                  >
                     <Ticket className="absolute -right-2 -bottom-2 w-20 h-20 text-amber-500 opacity-10" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="ceramic-inset p-1.5">
                              <Ticket className="w-4 h-4 text-amber-500" />
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Convites</span>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary line-clamp-1">Gerencie seus convites</p>
                     </div>
                  </motion.div>
               </motion.div>

               {/* Interviewer */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  onClick={() => onNavigateToView('journey')}
                  className="cursor-pointer"
               >
                  <InterviewerCard compact />
               </motion.div>

               {/* EraForge */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
                  onClick={() => onNavigateToView('eraforge')}
                  className="cursor-pointer"
               >
                  <motion.div
                     className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group"
                     style={{ background: 'linear-gradient(135deg, #F0EFE9 0%, #F5E8DC 100%)' }}
                     variants={cardElevationVariants}
                     initial="rest"
                     whileHover="hover"
                     whileTap="pressed"
                  >
                     <Compass className="absolute -right-2 -bottom-2 w-20 h-20 text-amber-700 opacity-10" />
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="ceramic-inset p-1.5">
                              <span className="text-lg">🏛️</span>
                           </div>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">EraForge</span>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary line-clamp-1">Aventuras na Historia</p>
                     </div>
                  </motion.div>
               </motion.div>

               {/* Invite Share */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={cardIndex++}
               >
                  <InviteShareCard onClick={() => setInviteModalOpen(true)} />
               </motion.div>

               {/* Active generic modules */}
               {activeGenericModules.map(mod => (
                  <motion.div
                     key={mod.id}
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={cardIndex++}
                     onClick={() => onNavigateToView(mod.route as ViewState)}
                     className="cursor-pointer"
                  >
                     <ModuleCard
                        moduleId={mod.id}
                        title={mod.label}
                        icon={ICON_MAP[mod.id] || Heart}
                        color="slate"
                        accentColor={ACCENT_MAP[mod.id] || ''}
                        onTasksLoaded={handleTasksLoaded}
                        compact
                     />
                  </motion.div>
               ))}
            </div>

            {/* Hidden ModuleCards for generic module tracking */}
            <div className="hidden">
               {genericModules.map(mod => (
                  <ModuleCard
                     key={`tracker-${mod.id}`}
                     moduleId={mod.id}
                     title={mod.label}
                     icon={ICON_MAP[mod.id] || Heart}
                     color="slate"
                     accentColor=""
                     onTasksLoaded={handleTasksLoaded}
                  />
               ))}
            </div>

            {/* Explore More — inactive generic modules */}
            {inactiveModules.length > 0 && (
               <ExploreMoreSection
                  modules={inactiveModules.map(m => ({
                     id: m.id,
                     icon: m.icon,
                     label: m.label,
                  }))}
                  onConfigure={(id) => {
                     const mod = MODULE_REGISTRY.find(m => m.id === id);
                     if (mod) onNavigateToView(mod.route as ViewState);
                  }}
               />
            )}
         </main>

         {/* Profile Drawer */}
         <ProfileDrawer
            isOpen={isProfileDrawerOpen}
            onClose={() => setProfileDrawerOpen(false)}
            userId={userId}
            userEmail={userEmail || ''}
            onDeleteAccount={handleDeleteAccount}
         />

         {/* Invite Modal */}
         <InviteModal
            isOpen={isInviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
         />
      </div>
   );
}
