/**
 * WaitlistButton — 3-state CTA for module waitlist
 * CS-002: ComingSoonModule UI
 *
 * States:
 * - default: "Me avise quando lancar"
 * - loading: spinner
 * - joined: "Voce sera avisado" with cancel
 */

import React, { useState } from 'react';
import { Bell, Check, Loader2, X } from 'lucide-react';

interface WaitlistButtonProps {
  isOnWaitlist: boolean;
  isLoading?: boolean;
  onJoin: () => Promise<boolean>;
  onLeave: () => Promise<boolean>;
  colorPrimary?: string;
}

export function WaitlistButton({
  isOnWaitlist,
  isLoading: externalLoading,
  onJoin,
  onLeave,
  colorPrimary = '#F59E0B',
}: WaitlistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const isLoadingState = loading || externalLoading;

  const handleJoin = async () => {
    setLoading(true);
    await onJoin();
    setLoading(false);
  };

  const handleLeave = async () => {
    setLoading(true);
    await onLeave();
    setLoading(false);
    setShowCancel(false);
  };

  if (isLoadingState) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ceramic-cool text-ceramic-text-secondary font-medium text-sm cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processando...</span>
      </button>
    );
  }

  if (isOnWaitlist) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCancel(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ceramic-success/10 text-ceramic-success font-medium text-sm transition-all hover:bg-ceramic-success/20"
        >
          <Check className="w-4 h-4" />
          <span>Voce sera avisado</span>
        </button>
        {showCancel && (
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-ceramic-error/10 text-ceramic-error text-sm transition-all hover:bg-ceramic-error/20"
            title="Sair da lista"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
      style={{ backgroundColor: colorPrimary }}
    >
      <Bell className="w-4 h-4" />
      <span>Me avise quando lancar</span>
    </button>
  );
}

export default WaitlistButton;
