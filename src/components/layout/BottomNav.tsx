import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Calendar, Sparkles, Network, Users } from 'lucide-react';

type ViewState = string;

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isOnPeopleRoute = location.pathname === '/people' || location.pathname === '/contacts';

  const items: { view: ViewState | 'people'; icon: typeof LayoutGrid; label: string }[] = [
    { view: 'vida', icon: LayoutGrid, label: 'Vida' },
    { view: 'agenda', icon: Calendar, label: 'Meu Dia' },
    { view: 'journey', icon: Sparkles, label: 'Jornada' },
    { view: 'connections', icon: Network, label: 'Conexões' },
    { view: 'people', icon: Users, label: 'Pessoas' },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="pointer-events-auto">
        <div className="ceramic-card h-16 px-6 flex items-center gap-6 rounded-full shadow-2xl backdrop-blur-md bg-opacity-95">
          {items.map(({ view, icon: Icon, label }) => {
            const isActive = view === 'people' ? isOnPeopleRoute : currentView === view;

            return (
              <button
                key={view}
                onClick={() => view === 'people' ? navigate('/contacts') : onChange(view)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive
                    ? 'text-ceramic-text-primary scale-110'
                    : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
