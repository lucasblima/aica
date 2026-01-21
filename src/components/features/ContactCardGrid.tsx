/**
 * ContactCardGrid Component
 *
 * Stable, animation-free grid component for displaying contact cards.
 *
 * CRITICAL: This component intentionally does NOT use Framer Motion animations
 * to prevent conflicts with ContactCard's internal motion.button animations.
 *
 * Issue #92: Rich WhatsApp Contact UI
 *
 * Architecture Decision:
 * - No parent-level Framer Motion animations (causes invisible cards)
 * - ContactCard has its own whileHover/whileTap animations (works correctly)
 * - Grid uses standard CSS grid (no motion.div wrapper)
 * - This separation prevents git merge conflicts from breaking card visibility
 */

import React from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactCard from './ContactCard';
import type { ContactNetwork } from '../../types/memoryTypes';

interface ContactCardGridProps {
  /** Filtered contacts to display */
  contacts: ContactNetwork[];
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Search query for empty state messaging */
  searchQuery?: string;
  /** Current filter source for empty state messaging */
  filterSource?: 'all' | 'google' | 'whatsapp';
  /** Callback when a contact card is clicked */
  onContactClick: (contact: ContactNetwork) => void;
}

export function ContactCardGrid({
  contacts,
  isLoading = false,
  searchQuery = '',
  filterSource = 'all',
  onContactClick,
}: ContactCardGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="ceramic-card p-5 animate-pulse"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-ceramic-text-secondary/20" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ceramic-text-secondary/20 rounded w-3/4" />
                <div className="h-3 bg-ceramic-text-secondary/20 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-ceramic-text-secondary/10">
              <div className="h-3 bg-ceramic-text-secondary/20 rounded w-full" />
              <div className="h-3 bg-ceramic-text-secondary/20 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (contacts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ceramic-card p-12 flex flex-col items-center justify-center text-center"
      >
        <Users className="w-16 h-16 text-ceramic-text-secondary/30 mb-4" />
        <p className="text-ceramic-text-secondary font-bold mb-2">
          {searchQuery || filterSource !== 'all'
            ? 'Nenhum contato encontrado'
            : 'Nenhum contato ainda'}
        </p>
        {!searchQuery && filterSource === 'all' && (
          <p className="text-xs text-ceramic-text-tertiary max-w-sm">
            Sincronize seus contatos do WhatsApp para começar
          </p>
        )}
      </motion.div>
    );
  }

  // Contact grid - INTENTIONALLY no Framer Motion wrapper
  // Using standard div to prevent animation conflicts with ContactCard
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((contact) => (
        <div key={contact.id}>
          <ContactCard
            contact={contact}
            onClick={() => onContactClick(contact)}
          />
        </div>
      ))}
    </div>
  );
}

export default ContactCardGrid;
