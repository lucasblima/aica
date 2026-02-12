import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { spaceService } from '../services/spaceService';
import { ARCHETYPE_CONFIG } from '../types';
import type { ArchetypeType, ConnectionSpace } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CreateSpaceModal');

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (space: ConnectionSpace) => void;
  initialArchetype?: ArchetypeType;
}

const archetypeKeys: ArchetypeType[] = ['habitat', 'ventures', 'academia', 'tribo'];

export function CreateSpaceModal({
  isOpen,
  onClose,
  onComplete,
  initialArchetype,
}: CreateSpaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [archetype, setArchetype] = useState<ArchetypeType>(initialArchetype || 'tribo');
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
      const space = await spaceService.createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
        archetype,
      });

      log.debug('Space created:', space.id);
      onComplete(space);
      handleClose();
    } catch (err) {
      log.error('Error creating space:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setArchetype(initialArchetype || 'tribo');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="ceramic-card w-full max-w-md p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-ceramic-text-primary text-etched">
                Novo Grupo
              </h2>
              <button
                onClick={handleClose}
                className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-95 transition-transform"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field */}
              <div>
                <label htmlFor="space-name" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Nome *
                </label>
                <input
                  id="space-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Futebol das quartas"
                  className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg"
                  autoFocus
                  maxLength={100}
                />
              </div>

              {/* Description field */}
              <div>
                <label htmlFor="space-desc" className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  id="space-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do grupo..."
                  className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg resize-none"
                  rows={2}
                  maxLength={300}
                />
              </div>

              {/* Archetype pills */}
              <div>
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-2">
                  {archetypeKeys.map((key) => {
                    const config = ARCHETYPE_CONFIG[key];
                    const isSelected = archetype === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setArchetype(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'ceramic-shadow bg-ceramic-accent/10 text-ceramic-accent ring-2 ring-ceramic-accent/30'
                            : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-ceramic-error font-medium">{error}</p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full ceramic-shadow px-6 py-3 text-sm font-bold text-white bg-ceramic-accent-dark rounded-full hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Criando...' : 'Criar Grupo'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateSpaceModal;
