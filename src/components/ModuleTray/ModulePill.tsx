/**
 * ModulePill Component
 * Track 2: Foundation Components - FASE 2.3
 *
 * Individual pill component for passive module display
 * Follows Ceramic Design System with flat card pattern
 */

import React from 'react';
import { motion } from 'framer-motion';
type ViewState = string;

export interface ModuleInfo {
  id: string;
  name: string;
  icon: string; // emoji
  route: ViewState;
  hasActivity?: boolean; // Shows dot indicator
  activityCount?: number;
}

export interface ModulePillProps {
  module: ModuleInfo;
  onClick: () => void;
}

export function ModulePill({ module, onClick }: ModulePillProps) {
  return (
    <motion.button
      onClick={onClick}
      className="ceramic-card-flat px-4 py-3 flex flex-col items-center gap-1.5 min-w-[80px] relative hover:scale-105 active:scale-95 transition-transform"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      data-testid={`module-pill-${module.id}`}
    >
      {/* Activity Indicator */}
      {module.hasActivity && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500"
          data-testid="activity-indicator"
        />
      )}

      {/* Icon */}
      <span className="text-2xl">{module.icon}</span>

      {/* Label */}
      <span className="text-xs font-medium text-ceramic-text-secondary truncate max-w-full">
        {module.name}
      </span>
    </motion.button>
  );
}

export default ModulePill;
