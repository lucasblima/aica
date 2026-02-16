/**
 * ParQStatusBadge — compact badge showing PAR-Q clearance status
 *
 * Colors follow Ceramic Design System semantic tokens:
 * - pending: gray
 * - cleared: green (success)
 * - cleared_with_restrictions: yellow (warning)
 * - blocked: red (error)
 * - expired: orange
 */

import React from 'react';
import type { ParQClearanceStatus } from '../../types/parq';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Clock } from 'lucide-react';

interface ParQStatusBadgeProps {
  status: ParQClearanceStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<ParQClearanceStatus, {
  label: string;
  bgClass: string;
  textClass: string;
  Icon: typeof Shield;
}> = {
  pending: {
    label: 'PAR-Q Pendente',
    bgClass: 'bg-ceramic-cool',
    textClass: 'text-ceramic-text-secondary',
    Icon: Shield,
  },
  cleared: {
    label: 'Liberado',
    bgClass: 'bg-ceramic-success/15',
    textClass: 'text-ceramic-success',
    Icon: ShieldCheck,
  },
  cleared_with_restrictions: {
    label: 'Restrições',
    bgClass: 'bg-ceramic-warning/15',
    textClass: 'text-ceramic-warning',
    Icon: ShieldAlert,
  },
  blocked: {
    label: 'Bloqueado',
    bgClass: 'bg-ceramic-error/15',
    textClass: 'text-ceramic-error',
    Icon: ShieldX,
  },
  expired: {
    label: 'Expirado',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-600',
    Icon: Clock,
  },
};

export function ParQStatusBadge({
  status,
  size = 'sm',
  showLabel = true,
}: ParQStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider
        ${config.bgClass} ${config.textClass} ${textSize} ${padding}
      `}
      title={config.label}
    >
      <config.Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
