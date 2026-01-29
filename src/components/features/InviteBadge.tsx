/**
 * InviteBadge Component
 *
 * Displays the user's available invite count in the header.
 * Gmail-style badge that shows invite availability.
 *
 * @example
 * <InviteBadge onClick={() => setShowInviteModal(true)} />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Ticket } from 'lucide-react';
import { useInviteSystem } from '../../hooks/useInviteSystem';

interface InviteBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function InviteBadge({ onClick, className = '' }: InviteBadgeProps) {
  const { availableCount, loading, hasInvites } = useInviteSystem();

  if (loading) {
    return (
      <div className={`w-10 h-10 rounded-full bg-ceramic-cool animate-pulse ${className}`} />
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5
        rounded-full ceramic-card
        hover:scale-105 active:scale-95
        transition-transform
        ${hasInvites ? 'text-ceramic-accent' : 'text-ceramic-text-tertiary'}
        ${className}
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
  );
}

export default InviteBadge;
