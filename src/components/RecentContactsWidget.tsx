/**
 * RecentContactsWidget Component
 * Displays recent contacts in a horizontal scroll widget on Home page
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users, User } from 'lucide-react';
import type { ContactNetwork } from '../types/memoryTypes';
import { getUserContacts } from '../services/contactNetworkService';
import { useAuth } from '../hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('RecentContactsWidget');

// Color palette for avatar backgrounds based on name
const AVATAR_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Contact Avatar with fallback to initials
function ContactAvatar({ contact }: { contact: ContactNetwork }) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = contact.avatar_url || contact.whatsapp_profile_pic_url;
  const showImage = avatarUrl && !imageError;

  const initials = useMemo(() => getInitials(contact.name), [contact.name]);
  const bgColor = useMemo(() => getAvatarColor(contact.name), [contact.name]);

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={contact.name}
        className="w-14 h-14 rounded-full object-cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

interface RecentContactsWidgetProps {
  onViewAllClick?: () => void;
  onContactClick?: (contact: ContactNetwork) => void;
}

export function RecentContactsWidget({ onViewAllClick, onContactClick }: RecentContactsWidgetProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real contacts from database
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadContacts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all contacts (already sorted by last_interaction_at DESC)
        const allContacts = await getUserContacts(user.id);

        // Limit to 6 most recent contacts for widget
        const recentContacts = allContacts.slice(0, 6);

        setContacts(recentContacts);

        log.debug('Loaded recent contacts:', {
          total: allContacts.length,
          displayed: recentContacts.length
        });
      } catch (err) {
        log.error('Error loading recent contacts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [user?.id]);

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

  // Show error state
  if (error) {
    return (
      <div className="ceramic-card p-6">
        <div className="flex items-center gap-2 text-ceramic-text-secondary">
          <Users className="w-5 h-5" />
          <p className="text-sm">Não foi possível carregar contatos recentes</p>
        </div>
      </div>
    );
  }

  // Hide widget if no contacts
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
              {/* Avatar with health score badge */}
              <div className="relative">
                <div className="ceramic-inset rounded-full p-0.5 group-hover:scale-110 transition-transform">
                  <ContactAvatar contact={contact} />
                </div>
                {/* Health score badge */}
                {contact.health_score != null && (
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md"
                    style={{
                      backgroundColor: contact.health_score >= 70 ? '#10B981' :
                                       contact.health_score >= 40 ? '#F59E0B' : '#EF4444'
                    }}
                  >
                    {contact.health_score}
                  </div>
                )}
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
