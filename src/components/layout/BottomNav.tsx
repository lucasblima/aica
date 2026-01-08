import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ViewState } from '../types';
import { LayoutGrid, Calendar, Mic, Network, Users, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
  onMicClick: () => void;
  isListening?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange, onMicClick, isListening = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on the /people or /contacts route
  const isOnPeopleRoute = location.pathname === '/people' || location.pathname === '/contacts';

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="pointer-events-auto relative">

        {/* Unified Floating Dock - Ceramic Card */}
        <div className="ceramic-card h-20 px-8 flex items-center gap-8 rounded-full shadow-2xl backdrop-blur-md bg-opacity-95">

          <button
            onClick={() => onChange('vida')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'vida' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <LayoutGrid className="w-6 h-6" strokeWidth={currentView === 'vida' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Vida</span>
          </button>

          <button
            onClick={() => onChange('agenda')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'agenda' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Calendar className="w-6 h-6" strokeWidth={currentView === 'agenda' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Agenda</span>
          </button>

          {/* Voice Button with Ambient Glow */}
          <div className="relative -top-8">
            {/* Ambient Glow Ring - only when not listening */}
            {!isListening && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 20px 2px rgba(217, 119, 6, 0.2)',
                    '0 0 30px 4px rgba(217, 119, 6, 0.3)',
                    '0 0 20px 2px rgba(217, 119, 6, 0.2)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            <button
              onClick={onMicClick}
              className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isListening
                  ? 'bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50'
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
            onClick={() => onChange('connections')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'connections' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Network className="w-6 h-6" strokeWidth={currentView === 'connections' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Conexões</span>
          </button>

          <button
            onClick={() => navigate('/people')}
            aria-label="Navegue para pessoas"
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isOnPeopleRoute ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Users className="w-6 h-6" strokeWidth={isOnPeopleRoute ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Pessoas</span>
          </button>

          <button
            onClick={() => onChange('studio')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentView === 'studio' ? 'text-ceramic-text-primary scale-110' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}
          >
            <Radio className="w-6 h-6" strokeWidth={currentView === 'studio' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Studio</span>
          </button>

        </div>

      </div>
    </div>
  );
};
