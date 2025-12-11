/**
 * FeedbackModal Component
 * Modal for collecting feedback on recommendation decisions
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackModalProps {
  moduleId?: string;
  moduleName?: string;
  onSubmit?: (reason: string, selectedReasons: string[]) => Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
}

const REJECTION_REASONS = [
  {
    id: 'not_interested',
    label: 'Não tenho interesse nesse tópico',
    icon: '😐',
  },
  {
    id: 'already_know',
    label: 'Já conheço esse conteúdo',
    icon: '✓',
  },
  {
    id: 'too_difficult',
    label: 'Muito difícil para meu nível',
    icon: '😣',
  },
  {
    id: 'no_time',
    label: 'Não tenho tempo agora',
    icon: '⏰',
  },
  {
    id: 'poor_recommendation',
    label: 'Não é uma boa recomendação para mim',
    icon: '❌',
  },
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  moduleId,
  moduleName,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;

    if (selectedReasons.length === 0 && !additionalFeedback.trim()) {
      alert('Por favor, selecione pelo menos uma razão ou forneça feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(additionalFeedback, selectedReasons);
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-ceramic-base rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-inset">
          <div>
            <h2 className="text-lg font-bold text-ceramic-text-primary">
              Por que pulou?
            </h2>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              Seu feedback nos ajuda a melhorar as recomendações
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ceramic-inset rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Reason Checkboxes */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-ceramic-text-primary block">
              Qual é o motivo?
            </label>
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                    transition-all duration-200
                    ${
                      selectedReasons.includes(reason.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-ceramic-inset bg-ceramic-inset/30 hover:border-ceramic-text-secondary/50'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason.id)}
                    onChange={() => handleReasonToggle(reason.id)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{reason.icon}</span>
                    <span className="text-sm text-ceramic-text-primary">
                      {reason.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Feedback */}
          <div className="space-y-2">
            <label htmlFor="feedback" className="text-sm font-semibold text-ceramic-text-primary block">
              Feedback adicional (opcional)
            </label>
            <textarea
              id="feedback"
              placeholder="Conte-nos mais..."
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value.slice(0, 500))}
              disabled={isSubmitting || isLoading}
              className="w-full px-4 py-3 rounded-lg border border-ceramic-inset bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary/50 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
              rows={4}
            />
            <div className="text-xs text-ceramic-text-secondary text-right">
              {additionalFeedback.length}/500
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 Seu feedback é valioso e nos ajuda a entender suas preferências.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 border-t border-ceramic-inset">
          <button
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-ceramic-inset text-ceramic-text-primary hover:bg-ceramic-inset transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              isLoading ||
              (selectedReasons.length === 0 && !additionalFeedback.trim())
            }
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackModal;
