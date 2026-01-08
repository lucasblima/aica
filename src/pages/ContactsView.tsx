/**
 * ContactsView Page
 * Dedicated page for viewing and managing contacts with Google Contacts sync
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Search } from 'lucide-react';
import { HeaderGlobal, ContactCard, ContactDetailModal } from '../components';
import { useAuth } from '../hooks/useAuth';
import type { ContactNetwork } from '../../types';

export function ContactsView() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactNetwork[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactNetwork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'google' | 'whatsapp'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactNetwork | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter contacts based on search and source
  useEffect(() => {
    let filtered = contacts;

    if (filterSource !== 'all') {
      filtered = filtered.filter(c => c.sync_source === filterSource);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone_number?.includes(query)
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, filterSource]);

  const handleContactSelect = (contact: ContactNetwork) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleContactSave = async (updatedContact: Partial<ContactNetwork>) => {
    console.log('[ContactsView] Contact save:', updatedContact);
    setIsDetailModalOpen(false);
  };

  const cardVariants = {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
    },
  };

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <HeaderGlobal
        title="Contatos"
        subtitle="Minha Rede de Conexões"
        userEmail={user?.email}
      />

      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Search and Filter Bar */}
        <div className="flex gap-3 items-end">
          {/* Search Input */}
          <div className="flex-1 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, email ou telefone..."
                className="w-full pl-10 px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          {/* Filter Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Filtro
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as 'all' | 'google' | 'whatsapp')}
              className="px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
            >
              <option value="all">Todos</option>
              <option value="google">Google</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        {/* Contact Grid */}
        {filteredContacts.length === 0 ? (
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
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={cardVariants.container}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredContacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  variants={cardVariants.item}
                  layout
                >
                  <ContactCard
                    contact={contact}
                    onClick={() => handleContactSelect(contact)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Results Counter */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-ceramic-text-secondary/10">
            <p className="text-xs text-ceramic-text-secondary font-medium">
              Mostrando {filteredContacts.length} contatos
            </p>
          </div>
        )}
      </main>

      {/* Contact Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedContact && (
          <ContactDetailModal
            contact={selectedContact}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            onSave={handleContactSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContactsView;
