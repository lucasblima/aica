/**
 * DeleteConfirmationModal Component
 *
 * Reusable confirmation modal for delete actions
 * - Ceramic design system styling
 * - Framer Motion animations
 * - Async action support
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="ceramic-card w-full max-w-md p-6 relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="absolute top-4 right-4 ceramic-inset p-2 rounded-lg hover:bg-ceramic-cool transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 text-ceramic-text-secondary" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="ceramic-inset p-4 rounded-full bg-ceramic-error/10">
                  <AlertTriangle className="w-8 h-8 text-ceramic-error" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">{title}</h2>
                <p className="text-sm text-ceramic-text-secondary leading-relaxed">{message}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 ceramic-card hover:bg-ceramic-cool transition-colors rounded-lg font-bold text-sm text-ceramic-text-primary disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-ceramic-error hover:bg-ceramic-error/90 transition-colors rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{confirmText}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
