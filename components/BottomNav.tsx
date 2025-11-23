
import React from 'react';
import { ViewState } from '../types';
import { LayoutGrid, CalendarClock, Mic } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
  onMicClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange, onMicClick }) => {
  const isLifeActive = currentView === 'life-dashboard';
  const isTimelineActive = currentView === 'timeline-agenda';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto relative h-24 w-full">
        
        {/* Glassmorphism Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white/85 backdrop-blur-xl border-t border-white/60 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] flex justify-between items-center px-10 rounded-t-[2.5rem]">
          
          {/* LEFT: MINHA VIDA (Strategic) */}
          <button 
            onClick={() => onChange('life-dashboard')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isLifeActive ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isLifeActive ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-transparent text-slate-500'}`}>
              <LayoutGrid className="w-6 h-6" strokeWidth={isLifeActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${isLifeActive ? 'text-indigo-600' : 'text-slate-400'}`}>
              VIDA
            </span>
          </button>

          {/* RIGHT: AGENDA (Tactical Timeline) */}
          <button 
            onClick={() => onChange('timeline-agenda')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isTimelineActive ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isTimelineActive ? 'bg-slate-800 text-white shadow-lg shadow-slate-500/30' : 'bg-transparent text-slate-500'}`}>
              <CalendarClock className="w-6 h-6 fill-current" strokeWidth={isTimelineActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${isTimelineActive ? 'text-slate-800' : 'text-slate-400'}`}>
              AGENDA
            </span>
          </button>
        </div>

        {/* CENTER: ORCHESTRATOR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button 
            onClick={onMicClick}
            className="group relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse-slow opacity-80 blur-md"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 border-4 border-white/40"></div>
            <Mic className="w-8 h-8 text-white relative z-10 drop-shadow-md" strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
};
