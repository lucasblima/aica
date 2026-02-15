/**
 * ConnectionStatusDot — ambient indicator for athlete ↔ user linking status
 *
 * Jony Ive approach: communicates through materiality, not decoration.
 * The indicator should feel like it belongs — not tacked on.
 *
 * none      → null (nothing rendered)
 * pending   → soft amber pill with subtle pulse — "Convite"
 * connected → calm green pill — "Conectado"
 *
 * Two sizes: 'sm' for inline with names, 'md' for detail views.
 */

import React from 'react';
import type { InvitationStatus } from '../types';

interface ConnectionStatusDotProps {
  status?: InvitationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function ConnectionStatusDot({ status, size = 'sm', className = '' }: ConnectionStatusDotProps) {
  if (!status || status === 'none') return null;

  const isPending = status === 'pending';

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 flex-shrink-0 ${className}`}
        title={isPending ? 'Aguardando o atleta criar conta AICA' : 'Atleta conectado ao AICA'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPending
              ? 'bg-amber-400/80 animate-[pulse_2s_ease-in-out_infinite]'
              : 'bg-ceramic-success'
          }`}
        />
      </span>
    );
  }

  // md: text pill for detail views
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
        isPending
          ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
          : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPending
            ? 'bg-amber-400 animate-[pulse_2s_ease-in-out_infinite]'
            : 'bg-emerald-500'
        }`}
      />
      {isPending ? 'Convite' : 'Conectado'}
    </span>
  );
}
