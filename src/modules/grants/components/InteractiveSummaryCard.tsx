/**
 * InteractiveSummaryCard - Reusable clickable stat card for the Ceramic UI
 * Used in EditalDetailView header to display summary metrics with optional click action
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InteractiveSummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string | React.ReactNode;
  subtext?: string;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'warning';
}

export const InteractiveSummaryCard: React.FC<InteractiveSummaryCardProps> = ({
  icon: Icon,
  label,
  value,
  subtext,
  onClick,
  variant = 'default'
}) => {
  const interactionClass = onClick
    ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg transition-all duration-300 group"
    : "";

  const iconColors = {
    default: 'text-ceramic-accent',
    success: 'text-green-600',
    warning: 'text-orange-600'
  };

  return (
    <div
      onClick={onClick}
      className={`ceramic-card p-4 ${interactionClass}`}
    >
      <div className="flex items-center gap-3">
        <div className={`ceramic-concave w-10 h-10 flex items-center justify-center ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <p className="text-xs text-ceramic-text-secondary">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ceramic-text-primary">{value}</p>
            {onClick && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-ceramic-accent bg-ceramic-accent/10 px-1.5 py-0.5 rounded-full font-bold">
                VER
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-[10px] text-ceramic-text-tertiary mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveSummaryCard;
