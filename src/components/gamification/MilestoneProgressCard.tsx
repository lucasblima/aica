/**
 * MilestoneProgressCard Component
 *
 * Progress card showing advancement towards milestone badges.
 * Features animated progress bar and completion status.
 *
 * Related: WhatsApp Gamification Integration (Issue #16)
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface MilestoneProgressCardProps {
  current: number;
  target: number;
  badgeName: string;
  badgeIcon: string;
  description: string;
}

export const MilestoneProgressCard: React.FC<MilestoneProgressCardProps> = ({
  current,
  target,
  badgeName,
  badgeIcon,
  description
}) => {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className="ceramic-inset p-4 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{badgeIcon}</span>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-ceramic-text-primary">
            {badgeName}
          </h4>
          <p className="text-xs text-ceramic-text-secondary">
            {description}
          </p>
        </div>
        <span className="text-sm font-bold text-ceramic-accent">
          {current}/{target}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-ceramic-base rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isComplete ? 'bg-ceramic-positive' : 'bg-ceramic-accent'
          }`}
        />
      </div>

      {isComplete && (
        <p className="text-xs text-ceramic-positive mt-2 font-bold">
          ✓ Completo! Badge será desbloqueado em breve
        </p>
      )}
    </div>
  );
};

export default MilestoneProgressCard;
