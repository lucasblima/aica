import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, List, Columns3, LayoutGrid } from 'lucide-react';

export type AgendaMode = 'agenda' | 'list' | 'kanban' | 'matrix';

interface AgendaModeToggleProps {
  mode: AgendaMode;
  onModeChange: (mode: AgendaMode) => void;
}

const segments: { key: AgendaMode; label: string; icon: React.ElementType }[] = [
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'list', label: 'Lista', icon: List },
  { key: 'kanban', label: 'Kanban', icon: Columns3 },
  { key: 'matrix', label: 'Matriz', icon: LayoutGrid },
];

export const AgendaModeToggle: React.FC<AgendaModeToggleProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <div className="relative flex items-center gap-1 rounded-full p-1 shadow-[inset_2px_2px_4px_rgba(163,158,145,0.25),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] bg-ceramic-cool">
      {segments.map((seg) => {
        const isActive = mode === seg.key;
        const Icon = seg.icon;
        return (
          <button
            key={seg.key}
            onClick={() => onModeChange(seg.key)}
            className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200"
          >
            {isActive && (
              <motion.div
                layoutId="agenda-mode-pill"
                className="absolute inset-0 rounded-full bg-amber-500 shadow-md"
                transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 1.0 }}
              />
            )}
            <span className={`relative flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-ceramic-text-secondary'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{seg.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
