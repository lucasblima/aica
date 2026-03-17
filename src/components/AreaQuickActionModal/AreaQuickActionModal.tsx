/**
 * AreaQuickActionModal Component
 * Track 4: Modals & Confirmation - GAP 2 & GAP 7
 *
 * Modal for life area quick actions triggered from ModuleTray
 * Follows ProfileModal pattern with ceramic design system
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export type AreaStatus = 'healthy' | 'attention' | 'critical';

export interface AreaSummary {
  id: string;
  name: string;
  icon: string; // emoji
  route: string;
  status: AreaStatus;
  pendingTasks: number;
  recentActivity?: string;
  nextAction?: {
    label: string;
    action: () => void;
  };
}

export interface AreaQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: AreaSummary | null;
  onNavigateToArea: () => void;
}

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-ceramic-success',
    bg: 'bg-ceramic-success/10',
    label: 'Saudavel',
  },
  attention: {
    icon: AlertTriangle,
    color: 'text-ceramic-warning',
    bg: 'bg-ceramic-warning/10',
    label: 'Atenção',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-ceramic-error',
    bg: 'bg-ceramic-error/10',
    label: 'Critico',
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export function AreaQuickActionModal({
  isOpen,
  onClose,
  area,
  onNavigateToArea,
}: AreaQuickActionModalProps) {
  if (!area) return null;

  const statusConfig = STATUS_CONFIG[area.status];
  const StatusIcon = statusConfig.icon;

  const handleQuickAction = () => {
    if (area.nextAction) {
      area.nextAction.action();
      onClose();
    }
  };

  const handleNavigate = () => {
    onNavigateToArea();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm ceramic-card p-0 overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="area-modal-title"
            data-testid="area-quick-action-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
              <div className="flex items-center gap-3">
                {/* Icon with ceramic-inset */}
                <div className="ceramic-inset w-12 h-12 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{area.icon}</span>
                </div>
                <div>
                  <h2
                    id="area-modal-title"
                    className="text-lg font-bold text-ceramic-text-primary"
                  >
                    {area.name}
                  </h2>
                  {/* Status badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig.bg} mt-1`}
                  >
                    <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                    <span className={`text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ceramic-text-secondary/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Stats Section */}
              <div className="ceramic-stats-tray space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ceramic-text-secondary">
                    Tarefas Pendentes
                  </span>
                  <span className="text-sm font-bold text-ceramic-text-primary">
                    {area.pendingTasks}
                  </span>
                </div>
                {area.recentActivity && (
                  <div className="pt-3 border-t border-ceramic-text-secondary/10">
                    <p className="text-xs text-ceramic-text-secondary mb-1">
                      Atividade Recente
                    </p>
                    <p className="text-sm text-ceramic-text-primary">
                      {area.recentActivity}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {area.nextAction && (
                  <motion.button
                    onClick={handleQuickAction}
                    className="w-full px-6 py-3 ceramic-card rounded-xl font-bold text-sm text-ceramic-text-primary hover:scale-[1.02] transition-transform"
                    whileTap={{ scale: 0.98 }}
                  >
                    {area.nextAction.label}
                  </motion.button>
                )}
                <motion.button
                  onClick={handleNavigate}
                  className="w-full px-6 py-3 ceramic-inset rounded-xl font-bold text-sm text-ceramic-text-primary hover:scale-[1.02] transition-transform"
                  whileTap={{ scale: 0.98 }}
                >
                  Ver Detalhes
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AreaQuickActionModal;
