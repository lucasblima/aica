import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary';

interface CeramicPillButtonProps {
  /** Button text content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Show arrow icon */
  showArrow?: boolean;
  /** Full width on mobile */
  fullWidthMobile?: boolean;
  /** Additional className */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CeramicPillButton
 *
 * Elevated pill-shaped button following the Digital Ceramic aesthetic.
 * Primary variant shows amber text on hover as per the design spec.
 *
 * @example
 * ```tsx
 * <CeramicPillButton onClick={handleStart} showArrow>
 *   Comecar Agora
 * </CeramicPillButton>
 * ```
 */
export function CeramicPillButton({
  children,
  onClick,
  variant = 'primary',
  showArrow = false,
  fullWidthMobile = true,
  className = '',
  ariaLabel,
  disabled = false,
}: CeramicPillButtonProps) {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    px-8 py-4 rounded-full
    font-semibold text-base
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ceramic-accent
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantStyles = {
    primary: `
      bg-ceramic-base text-ceramic-text-primary
      hover:text-ceramic-accent
      shadow-[6px_6px_12px_rgba(163,158,145,0.20),-6px_-6px_12px_rgba(255,255,255,0.90)]
      hover:shadow-[8px_8px_16px_rgba(163,158,145,0.25),-8px_-8px_16px_rgba(255,255,255,0.95)]
      active:shadow-[inset_3px_3px_6px_rgba(163,158,145,0.35),inset_-3px_-3px_6px_rgba(255,255,255,1.0)]
    `,
    secondary: `
      bg-transparent text-ceramic-text-secondary
      border-2 border-ceramic-text-secondary/30
      hover:border-ceramic-accent hover:text-ceramic-accent
    `,
  };

  const mobileStyles = fullWidthMobile ? 'w-full sm:w-auto' : '';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${mobileStyles} ${className}`}
      aria-label={ariaLabel}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span>{children}</span>
      {showArrow && (
        <motion.span
          className="inline-flex"
          initial={{ x: 0 }}
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.span>
      )}
    </motion.button>
  );
}

export default CeramicPillButton;
