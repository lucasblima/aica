
import React from 'react';
import { ViewState } from '../types';
import { LayoutGrid, Calendar, Mic } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
  onMicClick: () => void;
  isListening?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange, onMicClick, isListening = false }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto relative h-20 w-full">

        {/* Glass Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-2xl flex justify-between items-center px-12">

          <button
            onClick={() => onChange('vida')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'vida' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-6 h-6" strokeWidth={currentView === 'vida' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">VIDA</span>
          </button>

          <button
            onClick={() => onChange('agenda')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'agenda' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar className="w-6 h-6" strokeWidth={currentView === 'agenda' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">AGENDA</span>
          </button>
        </div>

        {/* Voice Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={onMicClick}
            className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${isListening
                ? 'bg-rose-500 animate-pulse shadow-rose-500/50'
                : 'bg-gradient-to-br from-indigo-600 to-violet-700 hover:scale-105 shadow-indigo-900/30'
              }`}
          >
            <Mic className="w-7 h-7 text-white" />
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></div>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
