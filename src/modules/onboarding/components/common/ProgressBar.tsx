/**
 * Progress Bar Component
 * Visual representation of progress through multi-step flows
 *
 * Features:
 * - Animated progress indicator
 * - Current/Total display
 * - Optional label
 * - Responsive design
 * - WCAG compliant
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'compact';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  variant = 'default',
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-semibold text-[#5C554B]">{label}</span>
        )}
        {showPercentage && (
          <span className="text-sm font-bold text-[#6B9EFF]">
            {percentage}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className={`w-full bg-[#E8E6E0] rounded-full overflow-hidden ${
        variant === 'compact' ? 'h-2' : 'h-3'
      }`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-[#6B9EFF] to-[#845EF7]"
        />
      </div>

      {/* Counter */}
      {variant === 'default' && (
        <div className="text-xs text-[#948D82] text-center">
          {current} de {total}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
