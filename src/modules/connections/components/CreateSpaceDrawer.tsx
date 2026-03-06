/**
 * CreateSpaceDrawer
 * Drawer for creating new Connection Spaces
 *
 * Replaces CreateSpaceModal with drawer pattern:
 * - Desktop: 600px slide-in from right
 * - Mobile: Full-height slide-in from bottom
 * - Swipe to dismiss on mobile
 * - Ceramic Design System
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { spaceService } from '../services/spaceService';
import { ARCHETYPE_CONFIG } from '../types';
import type { ArchetypeType, ConnectionSpace } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CreateSpaceDrawer');

interface CreateSpaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (space: ConnectionSpace) => void;
  initialArchetype?: ArchetypeType;
}

const archetypeKeys: ArchetypeType[] = ['habitat', 'ventures', 'academia', 'tribo'];

export function CreateSpaceDrawer({
  isOpen,
  onClose,
  onComplete,
  initialArchetype,
}: CreateSpaceDrawerProps) {
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close drawer if dragged down >100px on mobile
    if (info.offset.y > 100) {
      handleClose();
    }
  };

  const isFormValid = name.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer - Desktop: slide from right, Mobile: slide from bottom */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-ceramic-base shadow-2xl flex flex-col
                       sm:rounded-l-2xl overflow-hidden"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-border">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-border bg-ceramic-cool/20">
              <div>
                <h2 className="text-2xl font-black text-ceramic-text-primary text-etched">
                  Novo Grupo
                </h2>
                <p className="text-sm text-ceramic-text-secondary mt-1">
                  Configure os detalhes do grupo
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-ceramic-cool rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Form Content (scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Error message */}
                {error && (
                  <div className="p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
                    <p className="text-sm text-ceramic-error font-medium">{error}</p>
                  </div>
                )}

                {/* Name field */}
                <div>
                  <label
                    htmlFor="space-name"
                    className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2"
                  >
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
                  <label
                    htmlFor="space-desc"
                    className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2"
                  >
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="space-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descrição do grupo..."
                    className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30 rounded-lg resize-none"
                    rows={3}
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
              </div>
            </form>

            {/* Footer (fixed) */}
            <div className="flex items-center justify-end gap-3 p-6 pb-24 sm:pb-6 border-t border-ceramic-border bg-ceramic-cool/20">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent-dark disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando...
                  </span>
                ) : (
                  'Criar Grupo'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateSpaceDrawer;
