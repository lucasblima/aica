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
  type: 'new_user' | 'no_data_today' | 'insufficient_data' | 'no_data_period' | 'custom';
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  selectedDays?: number;
  customTitle?: string;
  customMessage?: string;
  primaryCTALabel?: string;
  secondaryCTALabel?: string;
  useCeramicInset?: boolean;
  icon?: React.ReactNode;
  illustration?: string;
}

/**
 * Configuration for each empty state type
 */
const EMPTY_STATE_CONFIG = {
  new_user: {
    icon: Sparkles,
    iconColor: '#667eea',
    title: 'Comece sua jornada',
    message: 'Registre seu primeiro momento e acompanhe sua evolução.',
    primaryCTA: 'Registrar momento',
    secondaryCTA: 'Conhecer sistema',
    illustration: '✨',
  },
  no_data_today: {
    icon: Plus,
    iconColor: '#10b981',
    title: 'Sem registros hoje',
    message: 'Registre um momento e evolua.',
    primaryCTA: 'Registrar momento',
    secondaryCTA: 'Ver histórico',
    illustration: '📝',
  },
  insufficient_data: {
    icon: TrendingUp,
    iconColor: '#f59e0b',
    title: 'Poucos dados',
    message: 'Mínimo 2 dias para ver tendências.',
    primaryCTA: 'Registrar momento',
    secondaryCTA: null,
    illustration: '📊',
  },
  no_data_period: {
    icon: Calendar,
    iconColor: '#8b5cf6',
    title: 'Sem dados',
    message: 'Sem registros neste período.',
    primaryCTA: 'Mudar período',
    secondaryCTA: 'Registrar momento',
    illustration: '📅',
  },
};

/**
 * EmptyState Component
 *
 * A flexible component for displaying empty states with calls-to-action.
 * Integrates with ceramic design system for warm, inviting appearances.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   type="no_data_today"
 *   onPrimaryAction={() => createMoment()}
 *   onSecondaryAction={() => viewHistory()}
 *   useCeramicInset={true}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onPrimaryAction,
  onSecondaryAction,
  selectedDays,
  customTitle,
  customMessage,
  primaryCTALabel,
  secondaryCTALabel,
  useCeramicInset = true,
  icon: customIcon,
  illustration: customIllustration,
}) => {
  // Use custom type config or fallback to defaults
  const config = type === 'custom'
    ? {
        icon: Sparkles,
        iconColor: '#667eea',
        title: customTitle || 'Estado Vazio',
        message: customMessage || 'Comece adicionando conteúdo',
        primaryCTA: primaryCTALabel || 'Começar',
        secondaryCTA: secondaryCTALabel || null,
        illustration: customIllustration || '✨',
      }
    : EMPTY_STATE_CONFIG[type];

  const Icon = customIcon ? () => <div>{customIcon}</div> : config.icon;

  // Customize message for no_data_period with selectedDays
  let displayMessage = customMessage || config.message;
  if (type === 'no_data_period' && selectedDays) {
    displayMessage = `Sem registros nos últimos ${selectedDays} dias.`;
  }

  // Use custom labels if provided
  const primaryCTAText = primaryCTALabel || config.primaryCTA;
  const secondaryCTAText = secondaryCTALabel || config.secondaryCTA;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
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
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const containerClass = useCeramicInset
    ? "ceramic-tray p-8"
    : "empty-state-container";

  return (
    <motion.div
      className={containerClass}
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
        {/* Primary Action - REQUIRED */}
        {primaryCTAText && onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="empty-state-btn empty-state-btn-primary"
            style={{
              backgroundColor: config.iconColor,
              borderColor: config.iconColor,
            }}
            aria-label={primaryCTAText}
          >
            <span>{primaryCTAText}</span>
            <ArrowRight className="empty-state-btn-icon" size={18} />
          </button>
        )}

        {/* Secondary Action - OPTIONAL */}
        {secondaryCTAText && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="empty-state-btn empty-state-btn-secondary"
            style={{
              color: config.iconColor,
              borderColor: `${config.iconColor}40`,
            }}
            aria-label={secondaryCTAText}
          >
            {secondaryCTAText}
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
