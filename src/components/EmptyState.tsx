/**
 * EmptyState Component
 *
 * Reusable component for displaying empty states across the application.
 * Supports 4 different types:
 * - new_user: First time access, onboarding
 * - no_data_today: Active user with no records today
 * - insufficient_data: Less than 2 days of data
 * - no_data_period: Selected period is empty
 *
 * Features:
 * - Ceramic design system integration
 * - Accessible (ARIA roles, WCAG AA contrast)
 * - Responsive (mobile and desktop)
 * - Smooth animations with Framer Motion
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import './EmptyState.css';

export interface EmptyStateProps {
  type: 'new_user' | 'no_data_today' | 'insufficient_data' | 'no_data_period';
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  selectedDays?: number;
  customTitle?: string;
  customMessage?: string;
}

/**
 * Configuration for each empty state type
 */
const EMPTY_STATE_CONFIG = {
  new_user: {
    icon: Sparkles,
    iconColor: '#667eea',
    title: 'Comece sua Jornada de Consciência',
    message: 'Bem-vindo! Registre seu primeiro momento de consciência para começar a acompanhar sua evolução pessoal.',
    primaryCTA: 'Registrar Primeiro Momento',
    secondaryCTA: 'Conhecer o Sistema',
    illustration: '✨',
  },
  no_data_today: {
    icon: Plus,
    iconColor: '#10b981',
    title: 'Nenhum Momento Registrado Ainda',
    message: 'Que tal começar seu dia registrando um momento de consciência? Cada registro conta para sua evolução.',
    primaryCTA: 'Registrar Momento',
    secondaryCTA: 'Ver Histórico',
    illustration: '📝',
  },
  insufficient_data: {
    icon: TrendingUp,
    iconColor: '#f59e0b',
    title: 'Dados Insuficientes',
    message: 'Continue registrando seus momentos! Você precisa de pelo menos 2 dias de registros para visualizar tendências e insights.',
    primaryCTA: 'Registrar Momento',
    secondaryCTA: null,
    illustration: '📊',
  },
  no_data_period: {
    icon: Calendar,
    iconColor: '#8b5cf6',
    title: 'Sem Dados no Período',
    message: 'Não encontramos registros para este período. Tente selecionar um período diferente ou comece a registrar momentos.',
    primaryCTA: 'Mudar Período',
    secondaryCTA: 'Registrar Momento',
    illustration: '📅',
  },
};

/**
 * EmptyState Component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onPrimaryAction,
  onSecondaryAction,
  selectedDays,
  customTitle,
  customMessage,
}) => {
  const config = EMPTY_STATE_CONFIG[type];
  const Icon = config.icon;

  // Customize message for no_data_period with selectedDays
  let displayMessage = customMessage || config.message;
  if (type === 'no_data_period' && selectedDays) {
    displayMessage = `Não encontramos registros para os últimos ${selectedDays} dias. Tente selecionar um período diferente ou comece a registrar momentos.`;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      className="empty-state-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      aria-label={`Estado vazio: ${customTitle || config.title}`}
    >
      {/* Icon */}
      <motion.div
        className="empty-state-icon-wrapper"
        variants={iconVariants}
      >
        <div
          className="empty-state-icon"
          style={{ backgroundColor: `${config.iconColor}15` }}
          aria-hidden="true"
        >
          <Icon
            className="empty-state-icon-svg"
            style={{ color: config.iconColor }}
            size={48}
          />
        </div>
        <motion.div
          className="empty-state-illustration"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        >
          {config.illustration}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div className="empty-state-content" variants={itemVariants}>
        <h3 className="empty-state-title">
          {customTitle || config.title}
        </h3>
        <p className="empty-state-message">
          {displayMessage}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div className="empty-state-actions" variants={itemVariants}>
        {/* Primary Action */}
        {config.primaryCTA && onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="empty-state-btn empty-state-btn-primary"
            style={{
              backgroundColor: config.iconColor,
              borderColor: config.iconColor,
            }}
            aria-label={config.primaryCTA}
          >
            <span>{config.primaryCTA}</span>
            <ArrowRight className="empty-state-btn-icon" size={18} />
          </button>
        )}

        {/* Secondary Action */}
        {config.secondaryCTA && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="empty-state-btn empty-state-btn-secondary"
            style={{
              color: config.iconColor,
              borderColor: `${config.iconColor}40`,
            }}
            aria-label={config.secondaryCTA}
          >
            {config.secondaryCTA}
          </button>
        )}
      </motion.div>

      {/* Decorative Elements */}
      <div className="empty-state-decoration" aria-hidden="true">
        <motion.div
          className="decoration-circle decoration-circle-1"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ backgroundColor: `${config.iconColor}20` }}
        />
        <motion.div
          className="decoration-circle decoration-circle-2"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          style={{ backgroundColor: `${config.iconColor}15` }}
        />
      </div>
    </motion.div>
  );
};

export default EmptyState;
