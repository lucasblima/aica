import React, { useState, useEffect } from 'react';
import { ViewState, AssociationDetail } from './types';
import { BottomNav } from './components/BottomNav';
import Login from './src/components/Login';
import {
   Wallet, Heart, Building2, BookOpen, Clock, Settings as SettingsIcon,
   ChevronRight, X
} from 'lucide-react';
import { supabase } from './src/supabaseClient';
import { getAssociations } from './src/services/supabaseService';

export default function App() {
   const [currentView, setCurrentView] = useState<ViewState>('vida');
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [associations, setAssociations] = useState<AssociationDetail[]>([]);
   const [showSettings, setShowSettings] = useState(false);

   // Auth check
   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         setIsAuthenticated(!!session);
      });

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setIsAuthenticated(!!session);
      });

      return () => subscription.unsubscribe();
   }, []);

   // Fetch associations when authenticated
   useEffect(() => {
      if (!isAuthenticated) return;

      const fetchAssociations = async () => {
         try {
            const data = await getAssociations();
            setAssociations(data as any);
         } catch (error) {
            console.error('Error fetching associations:', error);
         }
      };

      fetchAssociations();
   }, [isAuthenticated]);

   const handleMicClick = () => {
      console.log('Voice button clicked');
      // TODO: Implement voice recognition
      alert('🎤 Integração de voz em breve!');
   };

   // ==================== MINHA VIDA VIEW ====================
   const renderVida = () => (
      <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-gradient-to-b from-slate-50 to-white">
         {/* Header */}
         <header className="pt-8 px-6 pb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">LIFE OS</p>
            <h1 className="text-3xl font-black text-slate-800">Minha Vida</h1>
         </header>

         <div className="px-6 space-y-4">
            {/* Finanças Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg">
               <Wallet className="absolute right-4 top-4 w-24 h-24 opacity-20" />
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <Wallet className="w-5 h-5" />
                     <span className="text-xs font-bold uppercase tracking-wide opacity-90">Finanças</span>
                  </div>
                  <h2 className="text-2xl font-black mb-1">Mensalidades em dia</h2>
                  <div className="flex items-center gap-1 text-sm opacity-90">
                     <span className="w-2 h-2 rounded-full bg-white"></span>
                     Próximo vencimento: 05/Dez
                  </div>
               </div>
            </div>

            {/* Saúde Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg">
               <Heart className="absolute right-4 top-4 w-24 h-24 opacity-20" />
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <Heart className="w-5 h-5" />
                     <span className="text-xs font-bold uppercase tracking-wide opacity-90">Saúde & Bem-estar</span>
                  </div>
                  <h2 className="text-2xl font-black mb-1">Fazer Mega 10k</h2>
                  <div className="mt-2 text-sm opacity-90">
                     Meta de atividade física
                  </div>
               </div>
            </div>

            {/* Associações Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
               <Building2 className="absolute right-4 top-4 w-24 h-24 opacity-20" />
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <Building2 className="w-5 h-5" />
                     <span className="text-xs font-bold uppercase tracking-wide opacity-90">Minhas Associações</span>
                  </div>
                  <h2 className="text-2xl font-black mb-2">
                     {associations.length > 0 ? associations.length : '...'} Associações
                  </h2>
                  {associations.length > 0 && (
                     <div className="space-y-1 text-sm opacity-90">
                        {associations.slice(0, 2).map(assoc => (
                           <div key={assoc.id} className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              {assoc.name}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Educação Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg">
               <BookOpen className="absolute right-4 top-4 w-24 h-24 opacity-20" />
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <BookOpen className="w-5 h-5" />
                     <span className="text-xs font-bold uppercase tracking-wide opacity-90">Educação</span>
                  </div>
                  <h2 className="text-2xl font-black mb-2">Inglês Comunitário</h2>
                  <div className="flex items-center gap-3">
                     <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: '85%' }}></div>
                     </div>
                     <span className="text-2xl font-black">85%</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">Concluído</p>
               </div>
            </div>
         </div>
      </div>
   );

   // ==================== MEU DIA VIEW ====================
   const renderAgenda = () => (
      <div className="flex flex-col w-full pb-32 animate-fade-in-up min-h-screen bg-slate-50">
         {/* Header */}
         <header className="pt-8 px-6 pb-6 bg-white border-b border-slate-100 flex justify-between items-center">
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">HOJE</p>
               <h1 className="text-3xl font-black text-slate-800">Meu Dia</h1>
               <p className="text-sm text-indigo-600 font-medium mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <button
               onClick={() => setShowSettings(true)}
               className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
               <SettingsIcon className="w-5 h-5 text-slate-600" />
            </button>
         </header>

         <div className="p-6">
            {/* Timeline */}
            <div className="space-y-2">
               {/* 12:00 */}
               <div className="flex gap-4">
                  <div className="w-16 text-xs font-medium text-slate-400 pt-3">12:00</div>
                  <div className="flex-1 rounded-2xl p-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow">
                     <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase opacity-90">12:00 - 12:30</span>
                     </div>
                     <h3 className="font-bold text-sm">Almoço</h3>
                  </div>
               </div>

               {/* 13:00 - Now */}
               <div className="flex gap-4">
                  <div className="w-16 text-xs font-medium text-slate-400 pt-3">13:00</div>
                  <div className="flex-1 rounded-2xl p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow relative">
                     <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">
                        AGORA
                     </div>
                     <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase opacity-90">13:00 - 14:30</span>
                     </div>
                     <h3 className="font-bold text-sm">Reunião Diretoria AMAGAPA</h3>
                  </div>
               </div>

               {/* 15:00 */}
               <div className="flex gap-4">
                  <div className="w-16 text-xs font-medium text-slate-400 pt-3">15:00</div>
                  <div className="flex-1 rounded-2xl p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow">
                     <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase opacity-90">15:00 - 16:00</span>
                     </div>
                     <h3 className="font-bold text-sm">Vistoria Limpeza</h3>
                  </div>
               </div>

               {/* 18:00 */}
               <div className="flex gap-4">
                  <div className="w-16 text-xs font-medium text-slate-400 pt-3">18:00</div>
                  <div className="flex-1 rounded-2xl p-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow">
                     <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase opacity-90">18:00 - 19:00</span>
                     </div>
                     <h3 className="font-bold text-sm">Inglês Comunitário</h3>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );

   // ==================== SETTINGS MODAL ====================
   const renderSettings = () => (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end animate-fade-in">
         <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PERFIL E SISTEMA</p>
                  <h2 className="text-2xl font-black text-slate-800">Configurações</h2>
               </div>
               <button
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
               >
                  <X className="w-5 h-5 text-slate-600" />
               </button>
            </div>

            {/* User Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white mb-6">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-black">
                     GS
                  </div>
                  <div>
                     <h3 className="font-bold text-lg">Gestor Sênior</h3>
                     <p className="text-sm opacity-90">Admin do Sistema</p>
                  </div>
               </div>
               <div className="flex justify-between items-center">
                  <div>
                     <p className="text-xs opacity-75 uppercase tracking-wide">Associações</p>
                     <p className="text-2xl font-black">{associations.length}</p>
                  </div>
                  <div>
                     <p className="text-xs opacity-75 uppercase tracking-wide">IA Uso</p>
                     <p className="text-2xl font-black">98%</p>
                  </div>
               </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
               <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">Editar Perfil</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
               </button>
               <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">Notificações</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
               </button>
               <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">Segurança & Acesso</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
               </button>
               <button
                  onClick={async () => {
                     await supabase.auth.signOut();
                     setIsAuthenticated(false);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors text-rose-600">
                  <span className="font-bold">Sair do Sistema</span>
               </button>
            </div>
         </div>
      </div>
   );

   // ==================== MAIN RENDER ====================
   if (!isAuthenticated) {
      return <Login onLogin={() => setIsAuthenticated(true)} />;
   }

   return (
      <div className="h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col font-sans">
         {/* Dynamic Background */}
         <div className="fixed top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-100/50 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
         <div className="fixed bottom-0 left-[-10%] w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none mix-blend-multiply"></div>

         <main className="flex-1 relative z-10 overflow-y-auto w-full flex flex-col no-scrollbar">
            {currentView === 'vida' && renderVida()}
            {currentView === 'agenda' && renderAgenda()}
         </main>

         {showSettings && renderSettings()}

         <BottomNav
            currentView={currentView}
            onChange={setCurrentView}
            onMicClick={handleMicClick}
         />
      </div>
   );
}
