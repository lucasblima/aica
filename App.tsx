import React, { useState, useEffect } from 'react';
import { LayoutGrid, Calendar, Settings, Plus, ChevronRight, Wallet, Heart, Users, Building2, BookOpen, Scale, Briefcase, Globe, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { supabase } from './src/supabaseClient';
import { BottomNav } from './components/BottomNav';
import { LifeWeeksGrid } from './src/components/LifeWeeksGrid';
import { PomodoroTimer } from './src/components/PomodoroTimer';
import { DailyTimeline } from './src/components/DailyTimeline';
import { SettingsMenu } from './src/components/SettingsMenu';
import { HeaderGlobal } from './src/components/HeaderGlobal';
import { getAssociations, getDailyAgenda, getLifeAreas, createAssociation, getModuleTasks } from './src/services/supabaseService';
import Login from './src/components/Login';

// Types
type ViewState = 'vida' | 'agenda' | 'association_detail';
type TabState = 'personal' | 'network';

// Reusable Module Card Component
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
   const [activeTab, setActiveTab] = useState<TabState>('personal');
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [userId, setUserId] = useState<string | null>(null);
   const [userEmail, setUserEmail] = useState<string | null>(null);
   const [associations, setAssociations] = useState<any[]>([]);
   const [agenda, setAgenda] = useState<any[]>([]);
   const [lifeAreas, setLifeAreas] = useState<any[]>([]);

   // Association Detail State
   const [selectedAssociation, setSelectedAssociation] = useState<any>(null);
   const [associationModules, setAssociationModules] = useState<any[]>([]);

   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         setIsAuthenticated(!!session);
         setUserId(session?.user?.id || null);
         setUserEmail(session?.user?.email || null);
      });

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setIsAuthenticated(!!session);
         setUserId(session?.user?.id || null);
         setUserEmail(session?.user?.email || null);
      });

      return () => subscription.unsubscribe();
   }, []);

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

   // Helper to find module/area by name (case insensitive partial match)
   const findArea = (name: string) => {
      return lifeAreas.find(area => area.name.toLowerCase().includes(name.toLowerCase()));
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
                  showTabs={true}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
               />

               <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4 space-y-4">
                  {/* Life Weeks Grid */}
                  {userId && <LifeWeeksGrid userId={userId} />}

                  {/* Life Modules Grid - Bento Style */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Finanças */}
                     <ModuleCard
                        moduleId="finance"
                        title="Finanças"
                        icon={Wallet}
                        color="emerald"
                        accentColor="bg-emerald-50 border-emerald-100 text-emerald-600"
                     />

                     {/* Saúde & Bem-estar */}
                     <ModuleCard
                        moduleId="health"
                        title="Saúde"
                        icon={Heart}
                        color="orange"
                        accentColor="bg-orange-50 border-orange-100 text-orange-600"
                     />

                     {/* Associações */}
                     <div
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
                     </div>

                     {/* Educação */}
                     <ModuleCard
                        moduleId="education"
                        title="Educação"
                        icon={BookOpen}
                        color="amber"
                        accentColor="bg-amber-50 border-amber-100 text-amber-600"
                     />

                     {/* Jurídico */}
                     <ModuleCard
                        moduleId="legal"
                        title="Jurídico"
                        icon={Scale}
                        color="slate"
                        accentColor="bg-slate-50 border-slate-100 text-slate-600"
                     />
                  </div>
               </main>
            </div>
         );
      } else {
         // NETWORK TAB
         const networkAssocs = associations.filter(a => a.type !== 'personal');

         return (
            <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-ceramic-base">
               {renderHeader()}

               <div className="px-6 grid grid-cols-1 gap-4">
                  {/* Create New Association Button */}
                  <button className="ceramic-inset w-full p-4 flex items-center justify-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors group">
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
            </div>
         );
      }
   };

   // ==================== MEU DIA (AGENDA) VIEW ====================
   const renderAgenda = () => (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
         <HeaderGlobal
            title="Meu Dia"
            subtitle="HOJE"
            userEmail={userEmail || undefined}
            onLogout={() => setIsAuthenticated(false)}
         />

         <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4">
            {/* Liquid Agenda - Daily Timeline */}
            {userId && <DailyTimeline userId={userId} />}
         </main>
      </div>
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


   if (!isAuthenticated) {
      return <Login onLogin={() => setIsAuthenticated(true)} />;
   }

   return (
      <div className="bg-ceramic-base min-h-screen font-sans text-ceramic-text-primary">
         {currentView === 'vida' && renderVida()}
         {currentView === 'agenda' && renderAgenda()}
         {currentView === 'association_detail' && renderAssociationDetail()}

         {currentView !== 'association_detail' && (
            <BottomNav
               currentView={currentView}
               onChange={setCurrentView}
               onMicClick={() => alert('Voice AI Coming Soon')}
               isListening={false}
            />
         )}
      </div>
   );
}
