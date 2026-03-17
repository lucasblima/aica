/**
 * CreateAssessoriaModal
 *
 * Simple modal for coaches to create their "Assessoria Esportiva"
 * as a Connections Ventures entity. Collects name, description,
 * and accent color.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase } from 'lucide-react';
import type { CreateAssessoriaInput } from '../services/assessoriaService';

interface CreateAssessoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAssessoriaInput) => Promise<void>;
  isSubmitting?: boolean;
}

const ACCENT_COLORS = [
  { id: 'amber', label: 'Amber', class: 'bg-amber-500', ring: 'ring-amber-500' },
  { id: 'blue', label: 'Azul', class: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'green', label: 'Verde', class: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'red', label: 'Vermelho', class: 'bg-red-500', ring: 'ring-red-500' },
  { id: 'purple', label: 'Roxo', class: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'pink', label: 'Rosa', class: 'bg-pink-500', ring: 'ring-pink-500' },
];

export function CreateAssessoriaModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateAssessoriaModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('amber');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Nome da assessoria e obrigatório');
      return;
    }

    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        accentColor,
      });
      // Reset form after success
      setName('');
      setDescription('');
      setAccentColor('amber');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar assessoria');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDescription('');
      setAccentColor('amber');
      setError(null);
      onClose();
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-ceramic-base rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-ceramic-border bg-ceramic-cool/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-ceramic-text-primary">
                      Criar Assessoria
                    </h2>
                    <p className="text-xs text-ceramic-text-secondary">
                      Configure sua assessoria esportiva
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-ceramic-cool rounded-lg transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-ceramic-text-secondary" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Error */}
                {error && (
                  <div className="p-3 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
                    <p className="text-sm text-ceramic-error font-medium">{error}</p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label
                    htmlFor="assessoria-name"
                    className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2"
                  >
                    Nome da Assessoria *
                  </label>
                  <input
                    id="assessoria-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Assessoria Lucas Fit"
                    className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded-lg"
                    autoFocus
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="assessoria-desc"
                    className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2"
                  >
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="assessoria-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Treinamento personalizado para atletas de todos os niveis..."
                    className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded-lg resize-none"
                    rows={3}
                    maxLength={300}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                    Cor da Marca
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setAccentColor(color.id)}
                        disabled={isSubmitting}
                        className={`w-10 h-10 rounded-full ${color.class} transition-all ${
                          accentColor === color.id
                            ? `ring-2 ${color.ring} ring-offset-2 ring-offset-ceramic-base scale-110`
                            : 'opacity-60 hover:opacity-80 hover:scale-105'
                        }`}
                        aria-label={color.label}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-ceramic-border bg-ceramic-cool/20">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    'Criar Assessoria'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateAssessoriaModal;
