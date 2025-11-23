
import React, { useState } from 'react';
import { ViewState } from './types';
import { MOCK_DB } from './constants';
import { BottomNav } from './components/BottomNav';
import { 
  Building2, Users, Activity, CreditCard, 
  AlertTriangle, RefreshCw, 
  ArrowUpRight, Clock, Search, Filter, MoreVertical,
  LogOut, Bell, Shield, HelpCircle, ChevronRight, User, FolderKanban
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // --- COMPONENTES VISUAIS AUXILIARES (CSS CHARTS) ---

  const StackedBarChart = () => {
    const data = MOCK_DB.workloadDistribution;
    const total = data.backlog + data.todo + data.in_progress + data.review; 
    
    const getPercent = (val: number) => (val / total) * 100;

    return (
      <div className="w-full mt-4 space-y-3">
        {/* The Bar */}
        <div className="w-full h-4 rounded-full flex overflow-hidden shadow-inner bg-slate-100">
          <div style={{ width: `${getPercent(data.review)}%` }} className="h-full bg-purple-500" title="Review"></div>
          <div style={{ width: `${getPercent(data.in_progress)}%` }} className="h-full bg-blue-500" title="In Progress"></div>
          <div style={{ width: `${getPercent(data.todo)}%` }} className="h-full bg-amber-400" title="To Do"></div>
          <div style={{ width: `${getPercent(data.backlog)}%` }} className="h-full bg-slate-300" title="Backlog"></div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Revisão ({data.review})</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Em And. ({data.in_progress})</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> A Fazer ({data.todo})</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Backlog ({data.backlog})</div>
        </div>
      </div>
    );
  };

  const PriorityDonut = () => {
    const data = MOCK_DB.priorityDistribution;
    const total = data.urgent + data.high + data.medium + data.low;
    
    // Calculate conic gradient segments
    const pUrgent = (data.urgent / total) * 100;
    const pHigh = pUrgent + (data.high / total) * 100;
    const pMedium = pHigh + (data.medium / total) * 100;
    
    return (
      <div className="flex items-center gap-6 mt-2">
        {/* CSS Conic Gradient Donut */}
        <div className="relative w-24 h-24 rounded-full shadow-lg flex-shrink-0"
             style={{ 
               background: `conic-gradient(
                 #ef4444 0% ${pUrgent}%, 
                 #f97316 ${pUrgent}% ${pHigh}%, 
                 #3b82f6 ${pHigh}% ${pMedium}%, 
                 #cbd5e1 ${pMedium}% 100%
               )`
             }}>
           <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-slate-800 leading-none">{total}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Pendentes</span>
           </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
           <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <div className="w-1.5 h-6 rounded-full bg-red-500"></div> Urgente
              </span>
              <span className="font-bold text-red-600">{data.urgent}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <div className="w-1.5 h-4 rounded-full bg-orange-500"></div> Alta
              </span>
              <span className="font-bold text-orange-600">{data.high}</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <div className="w-1.5 h-3 rounded-full bg-blue-500"></div> Normal
              </span>
              <span className="font-bold text-slate-500">{data.medium + data.low}</span>
           </div>
        </div>
      </div>
    );
  };

  // --- HEADER COMPONENT ---
  const Header = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <header className="pt-8 px-6 pb-6 bg-white/80 backdrop-blur-md shadow-sm z-20 sticky top-0 border-b border-slate-100">
      <div className="flex justify-between items-end">
         <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{subtitle}</p>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h1>
         </div>
         {/* Logo Fallback se a imagem não carregar */}
         <div className="flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Aica" 
              className="h-12 w-auto object-contain drop-shadow-sm" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-md">A</div>';
              }}
            />
         </div>
      </div>
    </header>
  );

  // --- RENDERER: DASHBOARD VIEW ---
  const renderDashboard = () => (
    <div className="flex flex-col w-full pb-32 animate-fade-in-up">
      <Header title="Cockpit Estratégico" subtitle="Visão Geral do Sistema" />
      
      <div className="p-6 space-y-6">
        {/* ZONA 1: PULSE (KPIs) */}
        <section className="grid grid-cols-2 gap-3">
           {/* Card: Associações */}
           <div className="glass-panel p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-2">
                 <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-4 h-4" />
                 </div>
                 <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> {MOCK_DB.kpi.assocTrend}%
                 </div>
              </div>
              <div className="relative z-10">
                 <span className="text-3xl font-black text-slate-800 block">{MOCK_DB.kpi.totalAssociations}</span>
                 <span className="text-[10px] text-slate-500 font-medium">Associações Ativas</span>
              </div>
           </div>

           {/* Card: Usuários */}
           <div className="glass-panel p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users className="w-4 h-4" />
                 </div>
                 <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> {MOCK_DB.kpi.activeUsersTrend}%
                 </div>
              </div>
              <div>
                 <span className="text-3xl font-black text-slate-800 block">{MOCK_DB.kpi.activeUsers}</span>
                 <span className="text-[10px] text-slate-500 font-medium">Usuários Conectados</span>
              </div>
           </div>

           {/* Card: Sync Health */}
           <div className={`col-span-1 p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${MOCK_DB.systemHealth.failedSyncs > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-start">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${MOCK_DB.systemHealth.failedSyncs > 0 ? 'bg-white text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Activity className="w-4 h-4" />
                 </div>
                 {MOCK_DB.systemHealth.failedSyncs > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </div>
              <div>
                 <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${MOCK_DB.systemHealth.failedSyncs > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                       {MOCK_DB.systemHealth.syncSuccessRate}%
                    </span>
                 </div>
                 <span className={`text-[10px] font-medium ${MOCK_DB.systemHealth.failedSyncs > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {MOCK_DB.systemHealth.failedSyncs > 0 ? `${MOCK_DB.systemHealth.failedSyncs} Falhas Críticas` : 'Sincronização OK'}
                 </span>
              </div>
           </div>

           {/* Card: Credits */}
           <div className="glass-panel p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-3">
                 <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <CreditCard className="w-4 h-4" />
                 </div>
              </div>
              <div>
                 <div className="w-full h-1.5 bg-slate-100 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: '72%' }}></div>
                 </div>
                 <span className="text-[10px] text-slate-500 font-medium block">72% de Créditos Utilizados</span>
              </div>
           </div>
        </section>

        {/* ZONA 2: CORE ANALYTICS (Flow) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Workload Card */}
           <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50">
              <div className="flex justify-between items-center mb-1">
                 <h3 className="font-bold text-slate-800">Status do Fluxo</h3>
                 <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg">Items Ativos</span>
              </div>
              <StackedBarChart />
           </div>

           {/* Priority Card */}
           <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50">
              <div className="flex justify-between items-center mb-1">
                 <h3 className="font-bold text-slate-800">Radar de Urgência</h3>
                 <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg">Prioridade</span>
              </div>
              <PriorityDonut />
           </div>
        </section>

        {/* ZONA 3: RISK RADAR & FEED */}
        <div className="grid grid-cols-1 gap-6">
           
           {/* Risk Radar Table */}
           <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-rose-500" />
                 <h3 className="font-bold text-slate-800 text-sm">Itens Precisando de Atenção</h3>
              </div>
              <div className="divide-y divide-slate-50">
                 {MOCK_DB.riskItems.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                       <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                             <span className={`w-1.5 h-1.5 rounded-full ${item.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}></span>
                             <h4 className="text-sm font-bold text-slate-800 truncate">{item.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                             <span className="font-medium text-indigo-600 bg-indigo-50 px-1.5 rounded-md">{item.associationName}</span>
                             <span>•</span>
                             <span>{item.assigneeName}</span>
                             {item.isOverdue && <span className="text-rose-600 font-bold">• Atrasado</span>}
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          {item.syncStatus === 'failed' ? (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                                <RefreshCw className="w-3 h-3" /> Falha Sync
                             </span>
                          ) : (
                             <span className="text-[10px] font-medium text-slate-400 border border-slate-100 px-2 py-1 rounded-full">
                                {item.dueDate.split('-').reverse().slice(0,2).join('/')}
                             </span>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
              <div className="px-5 py-3 bg-slate-50/50 text-center">
                 <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Ver Todos (12)</button>
              </div>
           </section>

           {/* Activity Feed */}
           <section>
              <h3 className="font-bold text-slate-800 text-sm mb-3 px-1">Atividade Recente</h3>
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                 {MOCK_DB.recentActivity.map((log) => (
                    <div key={log.id} className="relative pl-6">
                       <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-50 ${
                          log.type === 'success' ? 'bg-emerald-400' :
                          log.type === 'warning' ? 'bg-rose-400' : 'bg-blue-400'
                       }`}></div>
                       <div className="flex flex-col">
                          <span className="text-xs text-slate-800">
                             <span className="font-bold">{log.user}</span> {log.action} <span className="font-medium text-slate-600">"{log.target}"</span>
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                             <Clock className="w-3 h-3" /> {log.timestamp}
                          </span>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

        </div>
      </div>
    </div>
  );

  // --- RENDERER: ASSOCIATIONS VIEW ---
  const renderAssociations = () => (
    <div className="flex flex-col w-full pb-32 animate-fade-in-up">
      <Header title="Associações" subtitle="Gestão de Entidades" />
      
      <div className="px-6 py-4">
        {/* Search Bar Mockup */}
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar por nome ou CNPJ..." 
            className="w-full h-12 pl-12 pr-4 bg-white rounded-xl shadow-sm border border-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-50 rounded-lg cursor-pointer">
             <Filter className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* Cards List */}
        <div className="space-y-4">
          {MOCK_DB.associationsList.map(assoc => (
            <div key={assoc.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform">
              
              {/* Health Indicator Strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                assoc.healthScore >= 90 ? 'bg-emerald-500' : 
                assoc.healthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}></div>

              <div className="flex justify-between items-start mb-3 pl-3">
                 <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{assoc.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{assoc.cnpj}</p>
                 </div>
                 <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                    assoc.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    assoc.syncStatus === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                 } flex items-center gap-1`}>
                    {assoc.syncStatus === 'synced' ? <RefreshCw className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {assoc.syncStatus === 'synced' ? 'Sync OK' : 'Falha Sync'}
                 </div>
              </div>

              <div className="pl-3 grid grid-cols-2 gap-4 mt-4">
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Workspace</p>
                    <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                       <FolderKanban className="w-3 h-3" /> {assoc.workspaceSlug}
                    </p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Membros</p>
                    <div className="flex items-center gap-1">
                       <div className="flex -space-x-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white"></div>
                          <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-white"></div>
                          <div className="w-5 h-5 rounded-full bg-slate-400 border-2 border-white"></div>
                       </div>
                       <p className="text-xs font-medium text-slate-600 ml-1">+{assoc.membersCount}</p>
                    </div>
                 </div>
              </div>

              {/* Status Footer */}
              <div className="pl-3 mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Atualizado: {assoc.lastSync}
                  </span>
                  <div className="flex items-center gap-1 text-slate-300">
                     Ver Detalhes <ChevronRight className="w-3 h-3" />
                  </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- RENDERER: SETTINGS VIEW ---
  const renderSettings = () => (
    <div className="flex flex-col w-full pb-32 animate-fade-in-up">
      <Header title="Configurações" subtitle="Perfil e Sistema" />
      
      <div className="p-6">
         {/* Profile Card */}
         <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl font-bold">
                  {MOCK_DB.currentUser.avatar_url}
               </div>
               <div>
                  <h2 className="text-xl font-bold">{MOCK_DB.currentUser.name}</h2>
                  <p className="text-indigo-200 text-sm">{MOCK_DB.currentUser.role}</p>
               </div>
            </div>

            <div className="mt-6 flex gap-4">
               <div className="bg-white/10 rounded-xl p-3 flex-1 text-center backdrop-blur-sm border border-white/10">
                  <span className="block text-2xl font-bold">42</span>
                  <span className="text-[10px] uppercase opacity-70">Associações</span>
               </div>
               <div className="bg-white/10 rounded-xl p-3 flex-1 text-center backdrop-blur-sm border border-white/10">
                  <span className="block text-2xl font-bold">98%</span>
                  <span className="text-[10px] uppercase opacity-70">SLA Sync</span>
               </div>
            </div>
         </div>

         {/* Menu Items */}
         <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {[
               { icon: User, label: 'Editar Perfil', action: 'Conta e dados pessoais' },
               { icon: Bell, label: 'Notificações', action: 'Gerenciar alertas', badge: '3' },
               { icon: Shield, label: 'Segurança & Acesso', action: 'Senha e 2FA' },
               { icon: HelpCircle, label: 'Suporte e Ajuda', action: 'Fale com a Aica' },
            ].map((item, idx) => (
               <button key={idx} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <item.icon className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                        <h4 className="font-bold text-slate-800 text-sm">{item.label}</h4>
                        <p className="text-xs text-slate-400">{item.action}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {item.badge && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                           {item.badge}
                        </span>
                     )}
                     <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
               </button>
            ))}
         </div>

         <button className="w-full mt-6 p-4 rounded-2xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
            <LogOut className="w-5 h-5" /> Sair do Sistema
         </button>
         
         <p className="text-center text-[10px] text-slate-300 mt-6 font-mono">
            Aica System v2.4.0 (Build 9821)
         </p>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col font-sans">
      {/* Dynamic Background */}
      <div className="fixed top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-100/50 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="fixed bottom-0 left-[-10%] w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none mix-blend-multiply"></div>

      <main className="flex-1 relative z-10 overflow-y-auto w-full flex flex-col no-scrollbar">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'associations' && renderAssociations()}
        {currentView === 'settings' && renderSettings()}
      </main>

      <BottomNav 
        currentView={currentView} 
        onChange={setCurrentView}
        onMicClick={() => {}} 
      />
    </div>
  );
}
