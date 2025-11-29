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
    <div className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="pointer-events-auto relative">

        {/* Unified Floating Dock - Ceramic Card */}
        <div className="ceramic-card h-20 px-10 flex items-center gap-16 rounded-full shadow-2xl backdrop-blur-md bg-opacity-95">

          <button
            onClick={() => onChange('vida')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'vida' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <LayoutGrid className="w-6 h-6" strokeWidth={currentView === 'vida' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Vida</span>
          </button>

          {/* Voice Button (Concave) - Floating above */}
          <div className="relative -top-8">
            <button
              onClick={onMicClick}
              className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${isListening
                ? 'bg-rose-500 animate-pulse shadow-rose-500/50'
                : 'ceramic-concave hover:scale-105'
                }`}
            >
              <Mic className={`w-6 h-6 ${isListening ? 'text-white' : 'text-ceramic-text-primary opacity-80'}`} />
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></div>
              )}
            </button>
          </div>

          <button
            onClick={() => onChange('agenda')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'agenda' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Calendar className="w-6 h-6" strokeWidth={currentView === 'agenda' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Agenda</span>
          </button>

        </div>

      </div>
    </div>
  );
};
