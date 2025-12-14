/**
 * ConnectionsLayout Component
 *
 * Layout wrapper for all Connections module pages.
 * Provides consistent header, breadcrumbs, and back navigation.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { useConnectionNavigation } from '../hooks/useConnectionNavigation';

interface ConnectionsLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Override breadcrumb items (optional) */
  breadcrumbs?: BreadcrumbItem[];
  /** Space name for breadcrumb override */
  spaceName?: string;
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
  /** Hide breadcrumbs */
  hideBreadcrumbs?: boolean;
}

/**
 * Layout wrapper for Connections pages
 *
 * @example
 * ```tsx
 * <ConnectionsLayout
 *   title="Meu Apartamento"
 *   subtitle="Habitat"
 *   spaceName="Meu Apartamento"
 *   showBackButton
 *   headerActions={<Button>Edit</Button>}
 * >
 *   <div>Page content here</div>
 * </ConnectionsLayout>
 * ```
 */
export function ConnectionsLayout({
  children,
  breadcrumbs: customBreadcrumbs,
  spaceName,
  showBackButton = false,
  onBackClick,
  title,
  subtitle,
  headerActions,
  className = '',
  hideBreadcrumbs = false,
}: ConnectionsLayoutProps) {
  const { getBreadcrumbs, goBack } = useConnectionNavigation();

  // Use custom breadcrumbs or generate from route
  const breadcrumbs = customBreadcrumbs || getBreadcrumbs();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      goBack();
    }
  };

  return (
    <div className={`min-h-screen bg-ceramic-base ${className}`}>
      {/* Header Section */}
      <header className="px-6 pt-6 pb-4 space-y-4">
        {/* Breadcrumbs */}
        {!hideBreadcrumbs && breadcrumbs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Breadcrumbs items={breadcrumbs} spaceName={spaceName} />
          </motion.div>
        )}

        {/* Title Section */}
        {(title || showBackButton || headerActions) && (
          <motion.div
            className="flex items-start justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Left: Back button + Title */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showBackButton && (
                <button
                  onClick={handleBackClick}
                  className="ceramic-concave w-10 h-10 flex items-center justify-center shrink-0 hover:scale-95 active:scale-90 transition-transform mt-1"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
                </button>
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

      {/* Main Content */}
      <main className="px-6 pb-40">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export default ConnectionsLayout;
