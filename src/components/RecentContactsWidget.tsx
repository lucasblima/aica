/**
 * RecentContactsWidget Component
 * Displays recent contacts in a horizontal scroll widget on Home page
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import type { ContactNetwork } from '../types';

interface RecentContactsWidgetProps {
  onViewAllClick?: () => void;
  onContactClick?: (contact: ContactNetwork) => void;
}

export function RecentContactsWidget({ onViewAllClick, onContactClick }: RecentContactsWidgetProps) {
  const [contacts, setContacts] = useState<ContactNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demo - in production, this would fetch from API
  useEffect(() => {
    // Simulated loading
    setIsLoading(true);
    setTimeout(() => {
      setContacts([
        {
          id: '1',
          name: 'João Silva',
          email: 'joao@example.com',
          avatar_url: 'https://i.pravatar.cc/150?img=1',
          health_score: 85,
          sync_source: 'google',
          last_interaction_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          name: 'Maria Santos',
          email: 'maria@example.com',
          avatar_url: 'https://i.pravatar.cc/150?img=2',
          health_score: 72,
          sync_source: 'whatsapp',
          last_interaction_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          name: 'Pedro Oliveira',
          email: 'pedro@example.com',
          avatar_url: 'https://i.pravatar.cc/150?img=3',
          health_score: 91,
          sync_source: 'google',
          last_interaction_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          name: 'Ana Costa',
          email: 'ana@example.com',
          avatar_url: 'https://i.pravatar.cc/150?img=4',
          health_score: 68,
          sync_source: 'whatsapp',
          last_interaction_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="ceramic-card p-6 space-y-3">
        <div className="h-4 bg-ceramic-text-secondary/10 rounded w-32 animate-pulse" />
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-full ceramic-inset animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ceramic-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="ceramic-inset p-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Contatos Recentes
          </h3>
        </div>
        <button
          onClick={onViewAllClick}
          className="flex items-center gap-1 text-xs font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal Scroll */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-2">
          {contacts.map((contact, idx) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onContactClick?.(contact)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
            >
              {/* Avatar with health score ring */}
              <div className="relative">
                <img
                  src={contact.avatar_url || '/default-avatar.png'}
                  alt={contact.name}
                  className="w-16 h-16 rounded-full object-cover ceramic-inset group-hover:scale-110 transition-transform"
                />
                {/* Health score badge */}
                <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {contact.health_score}
                </div>
              </div>

              {/* Name */}
              <p className="text-xs font-bold text-ceramic-text-primary group-hover:text-ceramic-text-secondary transition-colors truncate w-16 text-center">
                {contact.name.split(' ')[0]}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Source indicator */}
      <div className="mt-4 flex items-center gap-2 text-[10px] text-ceramic-text-secondary">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Google</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span>WhatsApp</span>
        </div>
      </div>
    </motion.div>
  );
}

export default RecentContactsWidget;
