/**
 * ConnectionStatusDot — ambient indicator for athlete ↔ user linking status
 *
 * none      → null (nothing rendered)
 * pending   → amber 6px pulsing dot, tooltip "Aguardando conexão..."
 * connected → green 6px solid dot, tooltip "Conectado"
 */

import React from 'react';
import type { InvitationStatus } from '../types';

interface ConnectionStatusDotProps {
  status?: InvitationStatus;
  className?: string;
}

export function ConnectionStatusDot({ status, className = '' }: ConnectionStatusDotProps) {
  if (!status || status === 'none') return null;

  const isPending = status === 'pending';

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        isPending
          ? 'bg-amber-400 animate-pulse'
          : 'bg-ceramic-success'
      } ${className}`}
      title={isPending ? 'Aguardando conexão...' : 'Conectado'}
    />
  );
}
