
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
    <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="pointer-events-auto relative">

        {/* Floating Ceramic Bar */}
        <div className="ceramic-card h-20 px-8 flex items-center gap-12 rounded-full shadow-2xl">

          <button
            onClick={() => onChange('vida')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'vida' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <LayoutGrid className="w-6 h-6" strokeWidth={currentView === 'vida' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">VIDA</span>
          </button>

          {/* Voice Button (Floating above) */}
          <div className="relative -top-8">
            <button
              onClick={onMicClick}
              className={`group relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${isListening
                ? 'bg-rose-500 animate-pulse shadow-rose-500/50'
                : 'bg-ceramic-text-primary hover:scale-105 shadow-lg'
                }`}
            >
              <Mic className="w-7 h-7 text-white" />
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></div>
              )}
            </button>
          </div>

          <button
            onClick={() => onChange('agenda')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'agenda' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Calendar className="w-6 h-6" strokeWidth={currentView === 'agenda' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">AGENDA</span>
          </button>

        </div>

      </div>
    </div>
  );
};
