import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, UserCheck } from 'lucide-react';
import { memberService } from '../services/memberService';
import { createNamespacedLogger } from '@/lib/logger';
import type { MemberRole } from '../types';

const log = createNamespacedLogger('AddMemberSheet');

type AddMode = 'registered' | 'external';

interface AddMemberSheetProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onMemberAdded: () => void;
}

export function AddMemberSheet({ isOpen, onClose, spaceId, onMemberAdded }: AddMemberSheetProps) {
  const [mode, setMode] = useState<AddMode>('external');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'external' && !name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (mode === 'registered' && !userId.trim()) {
      setError('UID do usuário é obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'registered') {
        await memberService.addMember(spaceId, {
          user_id: userId.trim(),
          role,
        });
      } else {
        await memberService.addMember(spaceId, {
          external_name: name.trim(),
          external_email: email.trim() || undefined,
          external_phone: phone.trim() || undefined,
          role,
        });
      }

      log.debug('Member added to space:', spaceId);
      resetForm();
      onMemberAdded();
    } catch (err) {
      log.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setUserId('');
    setRole('member');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid = mode === 'registered' ? userId.trim().length > 0 : name.trim().length > 0;

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
            className="fixed bottom-0 left-0 right-0 z-50 ceramic-card rounded-t-2xl p-6 pb-24 sm:pb-6 max-h-[80vh] overflow-y-auto"
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

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => { setMode('external'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'external'
                    ? 'bg-ceramic-accent text-white shadow-md'
                    : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <Users className="w-4 h-4" />
                Contato Externo
              </button>
              <button
                type="button"
                onClick={() => { setMode('registered'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'registered'
                    ? 'bg-ceramic-accent text-white shadow-md'
                    : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Usuário AICA
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'registered' ? (
                <div>
                  <label htmlFor="member-uid" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                    UID do Usuário *
                  </label>
                  <input
                    id="member-uid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="ex: ea2fb115-201d-4430-a0d8-445f2da6aea4"
                    className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-ceramic-text-secondary mt-1.5">
                    Copie o UID do usuário no Supabase Dashboard &gt; Authentication
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}

              {/* Role selector */}
              <div>
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Papel
                </label>
                <div className="flex gap-2">
                  {(['member', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        role === r
                          ? 'bg-ceramic-accent/10 text-ceramic-accent border-2 border-ceramic-accent'
                          : 'ceramic-inset text-ceramic-text-secondary'
                      }`}
                    >
                      {r === 'member' ? 'Membro' : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-ceramic-error font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isValid}
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
