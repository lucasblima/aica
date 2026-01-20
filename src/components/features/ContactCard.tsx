/**
 * ContactCard Component
 * Displays a contact in card format
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail } from 'lucide-react';
import type { ContactNetwork } from '../../types/memoryTypes';

interface ContactCardProps {
  contact: ContactNetwork;
  onClick: (contact: ContactNetwork) => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  // Use WhatsApp profile pic as fallback for avatar
  const avatarUrl = contact.avatar_url || contact.whatsapp_profile_pic_url || null;

  return (
    <motion.button
      onClick={() => onClick(contact)}
      className="ceramic-card p-5 text-left group hover:scale-[1.02] transition-all w-full cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={contact.name}
              className="w-14 h-14 rounded-full ceramic-inset object-cover"
              onError={(e) => {
                // Fallback to initials on image load error
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-14 h-14 rounded-full ceramic-inset flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white font-bold text-lg ${avatarUrl ? 'hidden' : ''}`}>
            {contact.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ceramic-text-primary truncate text-sm">
            {contact.name}
          </h3>
          <p className="text-xs text-ceramic-text-secondary truncate">
            {contact.relationship_type || 'Contato'}
          </p>
        </div>

        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold bg-blue-100">
          <span className="text-sm font-black text-blue-600">
            {contact.health_score || 0}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-ceramic-text-secondary/10 pt-3">
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-ceramic-text-secondary flex-shrink-0" />
            <span className="text-xs text-ceramic-text-secondary truncate">
              {contact.email}
            </span>
          </div>
        )}

        {contact.phone_number && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-ceramic-text-secondary flex-shrink-0" />
            <span className="text-xs text-ceramic-text-secondary truncate">
              {contact.phone_number}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

export default ContactCard;
