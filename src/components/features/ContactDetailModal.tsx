/**
 * ContactDetailModal Component
 * Full contact details view
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, MessageSquare } from 'lucide-react';
import type { ContactNetwork } from '../../types/memoryTypes';

interface ContactDetailModalProps {
  contact: ContactNetwork;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Partial<ContactNetwork>) => Promise<void>;
}

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
  onSave,
}: ContactDetailModalProps) {
  const [notes, setNotes] = useState(contact.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ id: contact.id, notes });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]"
          onClick={onClose}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-ceramic-base w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
              <div className="flex items-center gap-4">
                <img
                  src={contact.avatar_url || '/default-avatar.png'}
                  alt={contact.name}
                  className="w-16 h-16 rounded-full ceramic-inset object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold text-ceramic-text-primary">
                    {contact.name}
                  </h2>
                  <p className="text-sm text-ceramic-text-secondary">
                    {contact.relationship_type || 'Contato'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                  Informações
                </h3>

                {contact.email && (
                  <div className="flex items-center gap-3 ceramic-inset p-4 rounded-lg">
                    <Mail className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-ceramic-text-secondary font-bold uppercase tracking-wider">
                        Email
                      </p>
                      <p className="text-sm text-ceramic-text-primary truncate">
                        {contact.email}
                      </p>
                    </div>
                  </div>
                )}

                {contact.phone_number && (
                  <div className="flex items-center gap-3 ceramic-inset p-4 rounded-lg">
                    <Phone className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-ceramic-text-secondary font-bold uppercase tracking-wider">
                        Telefone
                      </p>
                      <p className="text-sm text-ceramic-text-primary truncate">
                        {contact.phone_number}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-3 border-t border-ceramic-text-secondary/10 pt-6">
                <label className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione anotações sobre este contato..."
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none min-h-[120px]"
                />
                <div className="text-right">
                  <span className="text-xs text-ceramic-text-tertiary">
                    {notes.length} / 1000
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-6 border-t border-ceramic-text-secondary/10">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-105 transition-all"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-8 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ContactDetailModal;
