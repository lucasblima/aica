/**
 * VidaPage — Central hub of AICA Life OS
 *
 * Home.tsx quality + inline chat hero.
 * Accepts same props as Home for ViewState system compatibility.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Heart, Building2, BookOpen, Scale, Mic, Briefcase, Compass, type LucideIcon } from 'lucide-react';
import { HeaderGlobal, ProfileDrawer, ModuleCard, ExploreMoreSection } from '../components';
import { VidaUniversalInput } from '@/components/features/VidaUniversalInput';
import { MementoMoriBar } from '@/components/features/MementoMoriBar';
import { LifeScoreWidget } from '@/components/features';
import { useLifeScore } from '@/hooks/useLifeScore';
import { FinanceCard } from '../modules/finance/components/FinanceCard';
import { GrantsCard } from '../modules/grants/components/GrantsCard';
import { JourneyHeroCard } from '../modules/journey';
import { useWeatherInsight } from '@/hooks/useWeatherInsight';
import { FluxCard } from '../modules/flux';
import { useConsciousnessPoints } from '../modules/journey/hooks/useConsciousnessPoints';
import { LEVEL_COLORS } from '../modules/journey/types/consciousnessPoints';
import { useGrantsHomeQuery } from '@/hooks/queries';
type ViewState = string;
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { notificationService } from '@/services/notificationService';

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
   onNavigateToFileSearch,
   onOpenAssociation,
   onSelectArchetype,
   onCreateAssociation
}: VidaPageProps) {
   const { user } = useAuth();


   // Cascade loading — components appear in vertical order
   const [cascadeStep, setCascadeStep] = useState(0);
   useEffect(() => {
      // Step 0: Header/CP/Avatar (immediate)
      // Step 1: MementoMori (~80ms)
      // Step 2: VidaUniversalInput (~160ms)
      // Step 3: JourneyHeroCard (~240ms)
      // Step 4: Module cards (~320ms)
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let step = 1; step <= 4; step++) {
         timers.push(setTimeout(() => setCascadeStep(step), step * 80));
      }
      return () => timers.forEach(clearTimeout);
   }, []);

   // Defer non-critical fetches to after cascade completes
   const deferredReady = cascadeStep >= 4;

   const { weather, insight: weatherInsight } = useWeatherInsight();

   const [modulesStatus, setModulesStatus] = useState<Record<string, number>>({});
   const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);

   // Identity data from Journey CP system
   const { stats: cpStats, progress: cpProgress } = useConsciousnessPoints();

   // Life Score — only show widget when 3+ domains are active
   const { activeDomains, isLoading: isLifeScoreLoading } = useLifeScore();
   const showLifeScore = !isLifeScoreLoading && activeDomains.length >= 3;

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
         const { error } = await supabase.functions.invoke('delete-account');

         if (error) {
            // Edge Function not deployed yet — LGPD fallback: register the request and sign out
            const isNotFound = error.message?.includes('404') ||
               error.message?.includes('not found') ||
               error.message?.includes('Function not found');

            if (isNotFound) {
               log.warn('delete-account Edge Function not deployed yet, using LGPD fallback');
               notificationService.showInfo(
                  'Funcionalidade em implantação',
                  'A exclusão automática de conta estará disponível em breve. Para solicitar a exclusão dos seus dados, envie um e-mail para contato@aica.guru.'
               );
               // Give the user time to read the notification before signing out
               await new Promise(resolve => setTimeout(resolve, 4000));
               await supabase.auth.signOut();
               window.location.href = '/';
               return;
            }

            // Other Edge Function errors
            log.error('Error invoking delete-account:', error);
            notificationService.showError(
               'Erro ao excluir conta',
               'Não foi possível excluir sua conta. Tente novamente ou entre em contato com o suporte.'
            );
            return;
         }

         // Success — account deletion processed
         notificationService.showSuccess(
            'Conta excluída',
            'Sua conta e todos os seus dados foram excluídos com sucesso.'
         );
         await new Promise(resolve => setTimeout(resolve, 2000));
         await supabase.auth.signOut();
         window.location.href = '/';
      } catch (error) {
         log.error('Error deleting account:', error);
         notificationService.showError(
            'Erro ao excluir conta',
            'Ocorreu um erro inesperado. Tente novamente ou entre em contato com contato@aica.guru.'
         );
      }
   };

   // Grants Card data via React Query
   const { data: grantsData } = useGrantsHomeQuery(userId, deferredReady);
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

   // Card animation indices (Journey=0, then grid cards in fixed order)
   const CARD_IDX = { finance: 1, grants: 2, flux: 3, studio: 4, connections: 5, eraforge: 6 } as const;

   return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
         <HeaderGlobal
            title="Minha Vida"
            subtitle="LIFE OS"
            userEmail={userEmail || undefined}
            avatarUrl={avatarUrl}
            userName={userName}
            onLogout={onLogout}
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

         <main className="flex-1 overflow-y-auto px-6 pb-40 pt-4 space-y-4">
            {/* Memento Mori — life progress bar (cascade step 1) */}
            {cascadeStep >= 1 && (
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
               >
                  <MementoMoriBar
                     onSetBirthdate={() => setProfileDrawerOpen(true)}
                     forecast={weather?.forecast}
                     weatherInsight={weatherInsight}
                  />
               </motion.div>
            )}

            {/* Universal Input — text + voice + action pills (cascade step 2) */}
            {cascadeStep >= 2 && (
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
               >
                  <VidaUniversalInput />
               </motion.div>
            )}

            {/* Quick Stats removed — CP is in header, Streak in JourneyHeroCard */}

            {/* Journey CTA — full width (cascade step 3) */}
            {cascadeStep >= 3 && (
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
            )}

            {/* Life Score — cross-domain composite (cascade step 3, 3+ domains required) */}
            {cascadeStep >= 3 && showLifeScore && (
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0.5}
               >
                  <LifeScoreWidget
                     onViewDetails={() => onNavigateToView('life-score')}
                  />
               </motion.div>
            )}

            {/* Module cards grid — all compact (cascade step 4) */}
            {cascadeStep >= 4 && (<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
               {/* Finance */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={CARD_IDX.finance}
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
                  custom={CARD_IDX.grants}
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
                  custom={CARD_IDX.flux}
               >
                  <FluxCard compact />
               </motion.div>

               {/* Studio */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={CARD_IDX.studio}
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
                  custom={CARD_IDX.connections}
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

               {/* EraForge */}
               <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={CARD_IDX.eraforge}
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

               {/* Active generic modules */}
               {activeGenericModules.map((mod, idx) => (
                  <motion.div
                     key={mod.id}
                     variants={cardVariants}
                     initial="hidden"
                     animate="visible"
                     custom={CARD_IDX.eraforge + 1 + idx}
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
            {/* end cascade step 5 */}
            </>)}
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
}
