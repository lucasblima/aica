/**
 * ConnectionsLayout Component
 *
 * Layout wrapper for all Connections module pages.
 * Provides consistent header with spatial depth navigation.
 *
 * Visual Hierarchy: Uses spatial depth instead of breadcrumbs.
 * Cards float above the dashboard, closing returns to layer below.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useConnectionNavigation } from '../hooks/useConnectionNavigation';

interface ConnectionsLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back button handler */
  onBackClick?: () => void;
  /** Page title (optional header) */
  title?: string;
  /** Page subtitle */
  subtitle?: string;
  /** Header actions (buttons, etc.) */
  headerActions?: React.ReactNode;
  /** Custom className for container */
  className?: string;
  /** Depth level for spatial navigation (0 = base, 1 = card, 2 = detail) */
  depth?: number;
}

/**
 * Layout wrapper for Connections pages
 *
 * Implements spatial depth navigation pattern:
 * - depth=0: Base dashboard layer
 * - depth=1: Card elevated above dashboard
 * - depth=2: Detail view elevated above card
 *
 * @example
 * ```tsx
 * <ConnectionsLayout
 *   title="Meu Apartamento"
 *   subtitle="Habitat"
 *   showBackButton
 *   depth={1}
 *   headerActions={<Button>Edit</Button>}
 * >
 *   <div>Page content here</div>
 * </ConnectionsLayout>
 * ```
 */
export function ConnectionsLayout({
  children,
  showBackButton = false,
  onBackClick,
  title,
  subtitle,
  headerActions,
  className = '',
  depth = 0,
}: ConnectionsLayoutProps) {
  const { goBack } = useConnectionNavigation();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      goBack();
    }
  };

  // Calculate spatial elevation based on depth
  const depthStyles = {
    0: '', // Base layer
    1: 'transform translate-y-0 scale-100', // Card layer - floats above
    2: 'transform translate-y-0 scale-[1.02]', // Detail layer - floats even higher
  }[depth] || '';

  return (
    <motion.div
      className={`min-h-screen bg-ceramic-base ${className} ${depthStyles}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={{
        zIndex: depth * 10, // Higher depth = higher z-index
      }}
    >
      {/* Header Section - Spatial Depth Navigation */}
      <header className="px-6 pt-6 pb-4">
        {/* Title Section with Back Button */}
        {(title || showBackButton || headerActions) && (
          <motion.div
            className="flex items-start justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left: Back button + Title */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showBackButton && (
                <motion.button
                  onClick={handleBackClick}
                  className="ceramic-concave w-10 h-10 flex items-center justify-center shrink-0"
                  whileHover={{ scale: 0.95 }}
                  whileTap={{ scale: 0.90 }}
                  aria-label="Voltar para camada anterior"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
                </motion.button>
              )}

              {title && (
                <div className="flex-1 min-w-0">
                  {subtitle && (
                    <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
                      {subtitle}
                    </p>
                  )}
                  <h1 className="text-2xl font-black text-ceramic-text-primary text-etched truncate">
                    {title}
                  </h1>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            {headerActions && (
              <div className="shrink-0">{headerActions}</div>
            )}
          </motion.div>
        )}
      </header>

      {/* Main Content - Elevated based on depth */}
      <main className="px-6 pb-40">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </motion.div>
  );
}

export default ConnectionsLayout;
