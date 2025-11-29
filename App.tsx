import React, { useState, useEffect } from 'react';
import { ViewState, AssociationDetail } from './types';
import { BottomNav } from './components/BottomNav';
import Login from './src/components/Login';
import { LifeWeeksGrid } from './src/components/LifeWeeksGrid';
import { PomodoroTimer } from './src/components/PomodoroTimer';
import {
   Wallet, Heart, Building2, BookOpen, Clock, Settings as SettingsIcon,
   ChevronRight, X, Plus, Users, ArrowLeft, LayoutGrid
} from 'lucide-react';
import { supabase } from './src/supabaseClient';
import {
   getAssociations,
   getDailyAgenda,
   getLifeAreas,
   createWorkItem,
   createAssociation,
   createModule,
   getAssociationModules,
   getModuleTasks
} from './src/services/supabaseService';

// Module Card Component to fetch and display tasks
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
      <div className="ceramic-card relative overflow-hidden p-6 hover:scale-[1.02] transition-transform duration-300">
         <Icon className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-5 ${accentColor.split(' ')[2]}`} />
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
                     <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                     <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
               ) : tasks.length > 0 ? (
                  tasks.map(task => (
                     <div key={task.id} className="flex items-start gap-2 group cursor-pointer">
                        <div className={`mt-1.5 w-2 h-2 rounded-full ${accentColor.split(' ')[2].replace('text-', 'bg-')}`}></div>
                        <span className="text-sm font-medium text-ceramic-text-primary line-clamp-2 group-hover:text-ceramic-text-secondary transition-colors">{task.title}</span>
                     </div>
                  ))
               ) : (
                  <p className="text-xs text-ceramic-text-secondary italic">Nenhuma tarefa pendente</p>
               )}
            </div>

            <div className="mt-4 pt-3 border-t border-ceramic-text-secondary/10 flex justify-between items-center">
               <span className="text-[10px] font-bold opacity-60 uppercase text-ceramic-text-secondary">Ver todos</span>
               <ChevronRight className="w-3 h-3 opacity-60 text-ceramic-text-secondary" />
            </div>
         </div>
      </div>
   );
};

export default function App() {
   const [currentView, setCurrentView] = useState<ViewState>('vida');
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [userId, setUserId] = useState<string | null>(null);
   const [associations, setAssociations] = useState<AssociationDetail[]>([]);
   const [agenda, setAgenda] = useState<any[]>([]);
   const [lifeAreas, setLifeAreas] = useState<any[]>([]);
   const [showSettings, setShowSettings] = useState(false);

   // New Interactive State
   const [activeTab, setActiveTab] = useState<'personal' | 'network'>('personal');
   const [selectedAssociation, setSelectedAssociation] = useState<AssociationDetail | null>(null);
   const [associationModules, setAssociationModules] = useState<any[]>([]);

   // Auth check
   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         setIsAuthenticated(!!session);
         setUserId(session?.user?.id || null);
      });

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setIsAuthenticated(!!session);
         setUserId(session?.user?.id || null);
      });

      return () => subscription.unsubscribe();
   }, []);

   // Fetch data when authenticated
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

   // Handle opening an association
   const handleOpenAssociation = async (assoc: AssociationDetail) => {
      setSelectedAssociation(assoc);
      setCurrentView('association_detail');
      // Fetch modules for this association
      const modules = await getAssociationModules(assoc.id);
      setAssociationModules(modules);
   };

   // Helper to find module/area by name (case insensitive partial match)
   const findArea = (name: string) => {
      return lifeAreas.find(area => area.name.toLowerCase().includes(name.toLowerCase()));
   };

   // ==================== HEADER COMPONENT ====================
   const renderHeader = () => (
      <header className="pt-8 px-6 pb-6">
         <div className="flex justify-between items-center mb-4">
            <div>
               <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">LIFE OS</p>
               <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">Minha Vida</h1>
            </div>
            {/* User Profile / Settings Icon */}
         </div>

         {/* Tabs */}
         <div className="flex p-1 ceramic-inset rounded-xl">
            <button
               onClick={() => setActiveTab('personal')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'personal' ? 'ceramic-card text-ceramic-text-primary' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }`}
            >
               Pessoal
            </button>
            <button
               onClick={() => setActiveTab('network')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'network' ? 'ceramic-card text-ceramic-text-primary' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }`}
            >
               Conexões
            </button>
         </div>
      </header>
   );

   // ==================== MINHA VIDA VIEW ====================
   const renderVida = () => {
      const personalAssoc = associations.find(a => a.type === 'personal');

      if (activeTab === 'personal') {
         const personalModules = lifeAreas.filter(m => m.association_id === personalAssoc?.id);

         return (
            <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-ceramic-base">
               {renderHeader()}

               <div className="px-6 space-y-4">
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
                        color="violet"
                        accentColor="bg-violet-50 border-violet-100 text-violet-600"
                     />
                  </div>
               </div>
            </div>
         );
      } else {
         // Network Tab
         const networkAssocs = associations.filter(a => a.type !== 'personal');

         return (
            <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-ceramic-base">
               {renderHeader()}

               <div className="px-6 space-y-4">
                  {networkAssocs.map(assoc => (
                     <div
                        key={assoc.id}
                        onClick={() => handleOpenAssociation(assoc)}
                        className="ceramic-card relative overflow-hidden p-6 hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                     >
                        <Building2 className="absolute right-4 top-4 w-24 h-24 opacity-5 text-ceramic-text-primary" />
                        <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="ceramic-inset p-2">
                                 <Building2 className="w-5 h-5 text-ceramic-text-primary" />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wide text-ceramic-text-secondary">Associação</span>
                           </div>
                           <h2 className="text-2xl font-black mb-2 text-ceramic-text-primary text-etched">{assoc.name}</h2>
                           <p className="text-sm text-ceramic-text-secondary">{assoc.description}</p>
                        </div>
                     </div>
                  ))}

                  {/* Add Association Button */}
                  <button
                     onClick={async () => {
                        const name = prompt('Nome da Associação (ex: AMAGAPA):');
                        if (name) {
                           await createAssociation({
                              name,
                              description: 'Nova associação',
                              type: 'association'
                           });
                           // Refresh
                           const assocs = await getAssociations();
                           setAssociations(assocs as any);
                        }
                     }}
                     className="w-full py-4 ceramic-inset rounded-3xl text-ceramic-text-secondary font-bold flex items-center justify-center gap-2 hover:text-ceramic-text-primary transition-colors"
                  >
                     <Users className="w-5 h-5" />
                     Criar/Entrar em Associação
                  </button>
               </div>
            </div>
         );
      }
   };

   // ==================== ASSOCIATION DETAIL VIEW ====================
   const renderAssociationDetail = () => {
      if (!selectedAssociation) return null;

      return (
         <div className="flex flex-col w-full pb-32 animate-fade-in-right min-h-screen bg-ceramic-base">
            {/* Header */}
            <header className="pt-8 px-6 pb-6 bg-ceramic-base">
               <button
                  onClick={() => setCurrentView('vida')}
                  className="flex items-center gap-2 text-ceramic-text-secondary font-bold mb-4 hover:text-ceramic-text-primary"
               >
                  <ArrowLeft className="w-5 h-5" />
                  Voltar
               </button>
               <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">GERENCIAMENTO</p>
               <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">{selectedAssociation.name}</h1>
               <p className="text-sm text-ceramic-text-secondary mt-1">{selectedAssociation.description}</p>
            </header>

            <div className="p-6 space-y-6">
               {/* Modules Section */}
               <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-3 text-etched">Módulos & Rotinas</h3>
                  <div className="grid grid-cols-2 gap-3">
                     {associationModules.map(module => (
                        <div key={module.id} className="ceramic-card p-4">
                           <h4 className="font-bold text-ceramic-text-primary">{module.name}</h4>
                           <p className="text-xs text-ceramic-text-secondary mt-1">{module.description}</p>
                        </div>
                     ))}

                     {/* Add Module Button */}
                     <button
                        onClick={async () => {
                           const name = prompt(`Novo Módulo para ${selectedAssociation.name}:`);
                           if (name) {
                              await createModule({
                                 name,
                                 association_id: selectedAssociation.id,
                                 description: 'Rotina da associação'
                              });
                              const modules = await getAssociationModules(selectedAssociation.id);
                              setAssociationModules(modules);
                           }
                        }}
                        className="ceramic-inset p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                     >
                        <Plus className="w-6 h-6" />
                        <span className="text-xs font-bold">Novo Módulo</span>
                     </button>
                  </div>
               </div>

               {/* Quick Actions */}
               <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-3 text-etched">Ações Rápidas</h3>
                  <button
                     onClick={() => {
                        const title = prompt('Nova Tarefa/Rotina:');
                        if (title) {
                           createWorkItem({
                              title,
                              association_id: selectedAssociation.id,
                              priority: 'high',
                              due_date: new Date().toISOString().split('T')[0]
                           }).then(() => alert('Tarefa criada! O n8n irá processar se configurado.'));
                        }
                     }}
                     className="w-full ceramic-card py-3 rounded-xl font-bold text-ceramic-text-primary hover:scale-[1.02] transition-transform"
                  >
                     + Criar Rotina (Dispara n8n)
                  </button>
               </div>
            </div>
         </div>
      );
   };

   // ==================== MEU DIA VIEW ====================
   const renderAgenda = () => (
      <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-ceramic-base">
         {/* Header */}
         <header className="pt-8 px-6 pb-6 bg-ceramic-base flex justify-between items-center">
            <div>
               <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">HOJE</p>
               <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">Meu Dia</h1>
               <p className="text-sm text-ceramic-text-secondary font-medium mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="flex gap-2">
               <button
                  onClick={() => {
                     const title = prompt('Nova Tarefa:');
                     if (title) {
                        // Default to Personal Association
                        const personalAssoc = associations.find(a => a.type === 'personal');
                        const assocId = personalAssoc?.id || associations[0]?.id;

                        if (!assocId) {
                           alert('Erro: Nenhuma associação encontrada.');
                           return;
                        }
                        createWorkItem({
                           title,
                           association_id: assocId,
                           priority: 'medium',
                           due_date: new Date().toISOString().split('T')[0]
                        }).then(() => {
                           getDailyAgenda().then(data => setAgenda(data as any));
                        });
                     }
                  }}
                  className="w-10 h-10 ceramic-card rounded-full flex items-center justify-center text-ceramic-text-primary hover:scale-110 transition-transform"
               >
                  <Plus className="w-5 h-5" />
               </button>
               <button className="w-10 h-10 ceramic-inset rounded-full flex items-center justify-center text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors">
                  <SettingsIcon className="w-5 h-5" />
               </button>
            </div>
         </header>

         {/* Pomodoro Timer */}
         <PomodoroTimer />

         {/* Timeline */}
         <div className="px-6 mt-6 space-y-4">
            {agenda.length === 0 ? (
               <div className="text-center py-12">
                  <p className="text-ceramic-text-secondary mb-2">Nenhuma tarefa para hoje.</p>
                  <p className="text-xs text-ceramic-text-secondary opacity-60">Toque no + para adicionar</p>
               </div>
            ) : (
               agenda.map((item, index) => (
                  <div key={item.id} className="flex gap-4 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                     <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-2 ${item.priority === 'urgent' ? 'bg-red-500' :
                           item.priority === 'high' ? 'bg-orange-500' : 'bg-indigo-500'
                           }`}></div>
                        <div className="w-0.5 h-full bg-ceramic-text-secondary/20 mt-1"></div>
                     </div>
                     <div className="flex-1 ceramic-card p-4 mb-2">
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-ceramic-text-primary">{item.title}</h3>
                           <span className="text-xs font-bold text-ceramic-text-secondary uppercase">{item.association?.name}</span>
                        </div>
                        <p className="text-sm text-ceramic-text-secondary mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs font-medium text-ceramic-text-secondary">
                           <Clock className="w-3 h-3" />
                           <span>{item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dia todo'}</span>
                        </div>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
   );

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
