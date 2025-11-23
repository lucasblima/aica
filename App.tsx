
import React, { useState, useEffect } from 'react';
import { User, ViewState, WorkItem, Category } from './types';
import { MOCK_DB } from './constants';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { Wallet, Heart, Building2, BookOpen, Mic, Check, Clock, Calendar, Square } from 'lucide-react';

// Helper para mapear ícones
const getCategoryIcon = (name: string) => {
  switch(name) {
    case 'Wallet': return <Wallet className="w-5 h-5" />;
    case 'Heart': return <Heart className="w-5 h-5" />;
    case 'Building2': return <Building2 className="w-5 h-5" />;
    case 'BookOpen': return <BookOpen className="w-5 h-5" />;
    default: return <Building2 className="w-5 h-5" />;
  }
};

// Helper para converter horário "HH:MM" em minutos totais do dia
const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('life-dashboard');
  const [isListening, setIsListening] = useState(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(0); 
  
  // Dados
  const [workItems, setWorkItems] = useState<WorkItem[]>(MOCK_DB.work_items);
  const categories = MOCK_DB.categories;

  useEffect(() => {
    const updateTime = () => {
      // Fixo em 14:15 para o mockup (visualização da linha do tempo)
      setCurrentTimeMinutes(14 * 60 + 15); 
    };
    updateTime();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleMicClick = () => {
    setIsListening(true);
    setTimeout(() => setIsListening(false), 2500);
  };

  const toggleTask = (id: string) => {
    setWorkItems(prev => prev.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  // --- RENDERER: 1. MINHA VIDA (Grid 2x2 Compacto) ---
  const renderLifeDashboard = () => {
    // Calcular progresso total do dia para o header
    const totalTasks = workItems.length;
    const completedTasks = workItems.filter(w => w.isCompleted).length;
    const globalProgress = Math.round((completedTasks / totalTasks) * 100) || 0;

    return (
      <div className="flex flex-col h-full px-4 pt-8 pb-28 animate-fade-in-up overflow-y-auto no-scrollbar">
        <header className="mb-6 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Minha Vida</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
              </div>
              <span className="text-xs font-bold text-slate-400">{globalProgress}% Hoje</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="Avatar" />
          </div>
        </header>

        {/* Grid 2x2 Estrito */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const catTasks = workItems.filter(w => w.categoryId === cat.id);
            const total = catTasks.length;
            const done = catTasks.filter(w => w.isCompleted).length;
            const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
            
            return (
              <div 
                key={cat.id}
                className={`
                  aspect-square relative overflow-hidden rounded-3xl p-4 text-white shadow-lg shadow-slate-200/50 active:scale-95 transition-transform flex flex-col justify-between
                  ${cat.colorBg}
                `}
              >
                {/* Icon Header */}
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                    {getCategoryIcon(cat.iconName)}
                  </div>
                  <span className="text-xl font-black opacity-20">{percentage}%</span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-bold leading-tight mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-white/70 text-[10px] line-clamp-1 mb-3">{cat.description}</p>
                  
                  {/* Compact Progress Bar */}
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] mt-1 font-medium opacity-80 text-right">{done}/{total} checks</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Resumo Rápido em baixo */}
        <div className="mt-6 p-4 rounded-2xl glass-panel border-none bg-white/60">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Próximo Passo</h4>
            {(() => {
                const nextTask = workItems.find(t => !t.isCompleted);
                if (!nextTask) return <p className="text-xs text-slate-500">Tudo feito por hoje!</p>;
                const cat = categories.find(c => c.id === nextTask.categoryId);
                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${cat?.colorBg}`}></div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">{nextTask.title}</p>
                            <p className="text-[10px] text-slate-500">Sugerido para agora</p>
                        </div>
                    </div>
                )
            })()}
        </div>
      </div>
    );
  };

  // --- RENDERER: 2. SPLIT VIEW (Timeline Horizontal + Lista) ---
  const renderSplitFocusView = () => {
    const startHour = 6;
    const endHour = 22;
    const totalHours = endHour - startHour;
    const pixelsPerHour = 60; // Largura na timeline horizontal
    
    const sortedTasks = [...workItems].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return (
      <div className="flex flex-col h-full w-full bg-slate-50 animate-fade-in-up">
        
        {/* --- TOP 30%: VISUAL TIMELINE (Horizontal) --- */}
        <div className="h-[30%] relative bg-white border-b border-slate-100 shrink-0 flex flex-col">
          <div className="px-6 py-3 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
            <h2 className="text-lg font-black text-slate-800">Visão do Dia</h2>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">25 Out</span>
          </div>
          
          <div className="flex-1 overflow-x-auto no-scrollbar relative items-center flex px-4">
             {/* Ruler Wrapper */}
             <div className="relative h-20" style={{ width: `${totalHours * pixelsPerHour}px` }}>
                
                {/* Hour Markers */}
                {Array.from({ length: totalHours + 1 }).map((_, i) => {
                   const hour = startHour + i;
                   return (
                     <div key={hour} className="absolute top-0 bottom-0 border-l border-slate-100 text-[10px] text-slate-400 pl-1 font-medium" style={{ left: `${i * pixelsPerHour}px` }}>
                        {hour}:00
                     </div>
                   );
                })}

                {/* Tasks Blocks */}
                {workItems.map(task => {
                  const cat = categories.find(c => c.id === task.categoryId);
                  if (!cat) return null;
                  
                  const startMin = timeToMinutes(task.startTime);
                  const endMin = timeToMinutes(task.endTime);
                  const dayStartMin = startHour * 60;
                  
                  // Posição horizontal
                  const leftPx = ((startMin - dayStartMin) / 60) * pixelsPerHour;
                  const widthPx = ((endMin - startMin) / 60) * pixelsPerHour;

                  return (
                    <div 
                      key={task.id}
                      className={`absolute top-4 h-10 rounded-lg shadow-sm border border-white/40 ${cat.colorBg} opacity-90 flex items-center justify-center`}
                      style={{ left: `${leftPx}px`, width: `${Math.max(widthPx, 20)}px` }}
                    >
                      {widthPx > 40 && <span className="text-[10px] text-white font-bold truncate px-1">{task.title}</span>}
                    </div>
                  )
                })}

                {/* Current Time Line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  style={{ left: `${((currentTimeMinutes - (startHour * 60)) / 60) * pixelsPerHour}px` }}
                >
                   <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-1 -left-[3px]"></div>
                </div>
             </div>
          </div>
        </div>

        {/* --- BOTTOM 70%: ACTIONABLE TASK LIST --- */}
        <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 bg-slate-50/50">
           <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Agenda de Execução</h3>
           
           <div className="space-y-3">
             {sortedTasks.map(task => {
               const cat = categories.find(c => c.id === task.categoryId);
               if (!cat) return null;

               // Verificar se é a tarefa atual (baseado no horário fictício)
               const startMin = timeToMinutes(task.startTime);
               const endMin = timeToMinutes(task.endTime);
               const isHappening = currentTimeMinutes >= startMin && currentTimeMinutes < endMin;

               return (
                 <div 
                   key={task.id} 
                   className={`
                     relative group flex items-center p-4 rounded-2xl bg-white border transition-all duration-300
                     ${isHappening ? 'border-indigo-200 shadow-lg shadow-indigo-100 scale-[1.02]' : 'border-slate-100 shadow-sm'}
                     ${task.isCompleted ? 'opacity-60' : 'opacity-100'}
                   `}
                 >
                    {/* Category Color Indicator Strip */}
                    <div className={`absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full ${cat.colorBg}`}></div>

                    {/* Time Column */}
                    <div className="ml-4 mr-4 flex flex-col items-center min-w-[3rem]">
                       <span className="text-sm font-bold text-slate-800">{task.startTime}</span>
                       <span className="text-[10px] text-slate-400">{task.endTime}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                       <h4 className={`text-sm font-bold text-slate-800 ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</h4>
                       <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 ${cat.colorText}`}>
                            {cat.name}
                          </span>
                          {isHappening && <span className="text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse">AGORA</span>}
                       </div>
                    </div>

                    {/* Action Checkbox */}
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all active:scale-90
                        ${task.isCompleted ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-300'}
                      `}
                    >
                      <Check className="w-6 h-6" strokeWidth={3} />
                    </button>
                 </div>
               );
             })}
             
             {/* Empty State Spacer */}
             <div className="h-10"></div>
           </div>
        </div>

      </div>
    );
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="h-full w-full bg-slate-50 relative overflow-hidden flex flex-col">
      {/* Subtle Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply animate-float"></div>
      <div className="fixed bottom-[20%] right-[-10%] w-[250px] h-[250px] bg-purple-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply animate-float" style={{animationDelay: '3s'}}></div>

      {/* Views */}
      <main className="flex-1 relative z-10 overflow-hidden">
        {currentView === 'life-dashboard' && renderLifeDashboard()}
        {currentView === 'timeline-agenda' && renderSplitFocusView()}
      </main>

      {/* Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in-up">
           <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.6)] mb-6 animate-pulse">
               <Mic className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-md">Ouvindo...</h2>
            <p className="text-white/80 mt-2 font-medium">"Adicionar treino amanhã às 10h"</p>
        </div>
      )}

      <BottomNav 
        currentView={currentView} 
        onChange={setCurrentView} 
        onMicClick={handleMicClick} 
      />
    </div>
  );
}
