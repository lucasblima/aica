/**
 * WaitlistCounter — Social proof counter
 * CS-002: ComingSoonModule UI
 *
 * Shows "X pessoas interessadas" with Realtime updates.
 * Hidden if count < 10.
 */

import React from 'react';
import { Users } from 'lucide-react';

interface WaitlistCounterProps {
  count: number;
  minDisplay?: number;
}

export function WaitlistCounter({ count, minDisplay = 10 }: WaitlistCounterProps) {
  if (count < minDisplay) return null;

  return (
    <div className="flex items-center gap-1.5 text-ceramic-text-secondary text-xs">
      <Users className="w-3.5 h-3.5" />
      <span>
        <strong className="text-ceramic-text-primary font-semibold">{count}</strong>{' '}
        pessoas interessadas
      </span>
    </div>
  );
}

export default WaitlistCounter;
