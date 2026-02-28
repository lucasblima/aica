/**
 * InviteBadge Component
 *
 * Displays the user's available invite count in the header.
 * Gmail-style badge that shows invite availability.
 *
 * @example
 * <InviteBadge onClick={() => setShowInviteModal(true)} />
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Copy, Check } from 'lucide-react';
import { useInviteSystem } from '../../hooks/useInviteSystem';

interface InviteBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function InviteBadge({ onClick, className = '' }: InviteBadgeProps) {
  const { availableCount, loading, hasInvites, copyLink } = useInviteSystem();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyLink]);

  if (loading) {
    return (
      <div className={`w-10 h-10 rounded-full bg-ceramic-cool animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`relative flex items-center gap-1 ${className}`}>
      <motion.button
        onClick={onClick}
        className={`
          relative flex items-center gap-1.5 px-3 py-1.5
          rounded-full ceramic-card
          hover:scale-105 active:scale-95
          transition-transform
          ${hasInvites ? 'text-ceramic-accent' : 'text-ceramic-text-tertiary'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`${availableCount} convites disponíveis`}
      >
        <Ticket className="w-4 h-4" />
        <span className="text-sm font-bold">{availableCount}</span>

        {/* Pulse indicator when invites available */}
        {hasInvites && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-ceramic-accent"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {hasInvites && (
        <motion.button
          onClick={handleCopyLink}
          className="w-8 h-8 rounded-full ceramic-card flex items-center justify-center text-ceramic-text-secondary hover:text-amber-500 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={copied ? 'Link copiado!' : 'Copiar link de convite'}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-ceramic-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </motion.button>
      )}
    </div>
  );
}

export default InviteBadge;
