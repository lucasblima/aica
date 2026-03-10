/**
 * TemplateSelector Component
 * Ceramic-styled modal for browsing and applying routine templates.
 * Shows template cards with preview and "Aplicar" action.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Repeat, ChevronRight, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import type { RoutineTemplate, RoutineTemplateItem } from '../../services/templateService';
import { describeRRuleInPortuguese } from '../../services/taskRecurrenceService';

export interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  /** Called after a template is successfully applied (e.g. to refresh task list). */
  onApplied: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single item preview row inside an expanded template card. */
const TemplateItemRow: React.FC<{ item: RoutineTemplateItem }> = ({ item }) => (
  <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-ceramic-base">
    <span className="text-sm text-ceramic-text-primary truncate mr-2">{item.title}</span>
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
        <Clock className="w-3 h-3" />
        {item.scheduledTime}
      </span>
      <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
        <Repeat className="w-3 h-3" />
        {describeRRuleInPortuguese(item.recurrenceRule)}
      </span>
    </div>
  </div>
);

/** A single template card with expand/collapse preview. */
const TemplateCard: React.FC<{
  template: RoutineTemplate;
  isApplying: boolean;
  onApply: (template: RoutineTemplate) => void;
}> = ({ template, isApplying, onApply }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-ceramic-cool border border-ceramic-border overflow-hidden">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-ceramic-border/30 transition-colors"
      >
        <span className="text-2xl flex-shrink-0" role="img" aria-label={template.name}>
          {template.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ceramic-text-primary truncate">
            {template.name}
          </h3>
          <p className="text-xs text-ceramic-text-secondary truncate">
            {template.description}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary flex-shrink-0">
          {template.items.length} tarefas
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      </button>

      {/* Expandable items preview + apply button */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Item list */}
              <div className="space-y-1">
                {template.items.map((item, idx) => (
                  <TemplateItemRow key={idx} item={item} />
                ))}
              </div>

              {/* Apply button */}
              <button
                type="button"
                disabled={isApplying}
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(template);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onClose,
  userId,
  onApplied,
}) => {
  const { templates, isApplying, error, applyTemplate, clearError } = useTemplates(userId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleApply = async (template: RoutineTemplate) => {
    setSuccessMessage(null);
    clearError();

    const count = await applyTemplate(template);
    if (count > 0) {
      setSuccessMessage(
        `${count} tarefa${count > 1 ? 's' : ''} criada${count > 1 ? 's' : ''} da rotina "${template.name}"`
      );
      onApplied();

      // Auto-dismiss success after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleClose = () => {
    setSuccessMessage(null);
    clearError();
    onClose();
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
            className="fixed inset-0 bg-black/40 z-50"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-ceramic-base rounded-t-2xl shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ceramic-border">
              <h2 className="text-base font-semibold text-ceramic-text-primary">
                Modelos de Rotina
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isApplying={isApplying}
                  onApply={handleApply}
                />
              ))}

              {templates.length === 0 && (
                <p className="text-center text-sm text-ceramic-text-secondary py-8">
                  Nenhum modelo disponivel.
                </p>
              )}
            </div>

            {/* Status bar (error / success) */}
            <AnimatePresence>
              {(error || successMessage) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 pb-4"
                >
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
                      <X className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      {successMessage}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Safe area spacer for mobile */}
            <div className="h-safe-area-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TemplateSelector;
