/**
 * EF_NavHeader - Shared navigation header for all EraForge screens
 *
 * Frosted glass bar with back arrow, title, optional subtitle,
 * and optional parent dashboard access icon.
 * Uses Framer Motion for smooth entrance and tactile press feedback.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { springPress } from '@/lib/animations/ceramic-motion';

export interface EF_NavHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onParentDashboard?: () => void;
  showParentAccess?: boolean;
}

export function EF_NavHeader({
  title,
  subtitle,
  onBack,
  onParentDashboard,
  showParentAccess = false,
}: EF_NavHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-30 flex items-center h-14 px-3 bg-white/60 backdrop-blur-md border-b border-ceramic-border/40"
    >
      {/* Left: back button */}
      <div className="w-10 flex-shrink-0">
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={springPress}
            onClick={onBack}
            aria-label="Voltar"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ceramic-cool/60 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-ceramic-text-primary"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
      </div>

      {/* Center: title + subtitle */}
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-base font-bold text-ceramic-text-primary font-fredoka leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-ceramic-text-secondary leading-tight truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: parent dashboard icon */}
      <div className="w-10 flex-shrink-0 flex justify-end">
        {showParentAccess && onParentDashboard && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={springPress}
            onClick={onParentDashboard}
            aria-label="Painel dos Pais"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ceramic-cool/60 transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="text-ceramic-text-secondary"
            >
              <rect
                x="3"
                y="7"
                width="12"
                height="9"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M6 7V5a3 3 0 116 0v2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="9" cy="12" r="1.25" fill="currentColor" />
            </svg>
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
