/**
 * ContactCard Component
 * Displays a contact in card format
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail } from 'lucide-react';
import type { ContactNetwork } from '../../types/memoryTypes';
import { ContactAvatar } from '@/components/ui';

interface ContactCardProps {
  contact: ContactNetwork;
  onClick: (contact: ContactNetwork) => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  return (
    <motion.button
      onClick={() => onClick(contact)}
      className="ceramic-card p-5 text-left group hover:scale-[1.02] transition-all w-full cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <ContactAvatar
            name={contact.name}
            whatsappProfilePicUrl={contact.whatsapp_profile_pic_url}
            avatarUrl={contact.avatar_url}
            size="lg"
            className="ceramic-inset"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ceramic-text-primary truncate text-sm">
            {contact.name}
          </h3>
          <p className="text-xs text-ceramic-text-secondary truncate">
            {contact.relationship_type || 'Contato'}
          </p>
        </div>

        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold bg-ceramic-info/10">
          <span className="text-sm font-black text-ceramic-info">
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
