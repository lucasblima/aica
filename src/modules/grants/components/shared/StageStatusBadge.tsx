/**
 * StageStatusBadge - Visual indicator for stage completion status
 */

import React from 'react';
import { Check, Circle, AlertCircle } from 'lucide-react';
import type { StageCompletionStatus } from '../../types/workspace';

interface StageStatusBadgeProps {
  status: StageCompletionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<StageCompletionStatus, {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  label: string;
}> = {
  none: {
    icon: Circle,
    bgColor: 'bg-[#948D82]/20',
    textColor: 'text-[#948D82]',
    label: 'Nao iniciado',
  },
  partial: {
    icon: AlertCircle,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    label: 'Em progresso',
  },
  complete: {
    icon: Check,
    bgColor: 'bg-ceramic-success-bg',
    textColor: 'text-ceramic-success',
    label: 'Completo',
  },
};

const SIZE_CONFIG = {
  sm: {
    wrapper: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    wrapper: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    wrapper: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-4 h-4',
  },
};

export const StageStatusBadge: React.FC<StageStatusBadgeProps> = ({
  status,
  showLabel = false,
  size = 'sm',
}) => {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor} ${sizeConfig.wrapper}
      `}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default StageStatusBadge;
