import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { memberService } from '../services/memberService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AddMemberSheet');

interface AddMemberSheetProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onMemberAdded: () => void;
}

export function AddMemberSheet({ isOpen, onClose, spaceId, onMemberAdded }: AddMemberSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await memberService.addMember(spaceId, {
        external_name: name.trim(),
        external_email: email.trim() || undefined,
        external_phone: phone.trim() || undefined,
        role: 'member',
      });

      log.debug('Member added to space:', spaceId);
      setName('');
      setEmail('');
      setPhone('');
      onMemberAdded();
    } catch (err) {
      log.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setPhone('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 ceramic-card rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-ceramic-text-secondary/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-ceramic-accent" />
                <h3 className="text-lg font-black text-ceramic-text-primary">Adicionar Membro</h3>
              </div>
              <button
                onClick={handleClose}
                className="ceramic-inset w-8 h-8 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="member-name" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Nome *
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da pessoa"
                  className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="member-email" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Email (opcional)
                </label>
                <input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="member-phone" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Telefone (opcional)
                </label>
                <input
                  id="member-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg"
                />
              </div>

              {error && (
                <p className="text-sm text-ceramic-error font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full ceramic-shadow px-6 py-3 text-sm font-bold text-white bg-ceramic-accent-dark rounded-full hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adicionando...' : 'Adicionar'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AddMemberSheet;
