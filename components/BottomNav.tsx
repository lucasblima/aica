
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Settings, Command } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
  onMicClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange, onMicClick }) => {
  const isDashActive = currentView === 'dashboard';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto relative h-20 w-full">
        
        {/* Glass Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-2xl flex justify-between items-center px-12">
          
          <button 
            onClick={() => onChange('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all ${isDashActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard className="w-6 h-6" strokeWidth={isDashActive ? 2.5 : 2} />
          </button>

          <button 
            onClick={() => onChange('settings')}
            className={`flex flex-col items-center gap-1 transition-all text-slate-400 hover:text-slate-600`}
          >
            <Settings className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Action Button (Command Center) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button 
            onClick={onMicClick}
            className="group relative w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform active:scale-95"
          >
            <Command className="w-7 h-7 text-white" />
          </button>
        </div>

      </div>
    </div>
  );
};
