/**
 * ModuleAgentFAB — Floating action button to open module agent chat
 *
 * Small, lightweight button that sits in the module view
 * and opens the ModuleAgentChat overlay when clicked.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

interface ModuleAgentFABProps {
  onClick: () => void;
  accentBg?: string;
  label?: string;
}

export const ModuleAgentFAB: React.FC<ModuleAgentFABProps> = ({
  onClick,
  accentBg = 'bg-amber-500',
  label = 'Agente IA',
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-6 z-40 ${accentBg} text-white rounded-full px-4 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2`}
      title={label}
    >
      <Sparkles className="w-5 h-5" />
      <span className="text-sm font-medium hidden sm:inline">{label}</span>
    </button>
  );
};

export default ModuleAgentFAB;
