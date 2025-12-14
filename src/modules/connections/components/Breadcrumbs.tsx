/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumb trail for Connections module.
 * Shows hierarchical path: Connections > Habitat > My Space > Section
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
}

interface BreadcrumbsProps {
  /** Breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Override space name (for dynamic space names) */
  spaceName?: string;
  /** Maximum label length before truncation */
  maxLength?: number;
  /** Custom className */
  className?: string;
}

/**
 * Breadcrumbs navigation component
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Conexões', path: '/connections', icon: '🔗' },
 *     { label: 'Habitat', path: '/connections/habitat', icon: '🏠' },
 *     { label: 'Meu Apartamento', path: '/connections/habitat/123' }
 *   ]}
 *   spaceName="Meu Apartamento"
 *   maxLength={30}
 * />
 * ```
 */
export function Breadcrumbs({
  items,
  spaceName,
  maxLength = 30,
  className = '',
}: BreadcrumbsProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  // Override space label if spaceName is provided
  const processedItems = spaceName
    ? items.map((item, index) => {
        // Replace the space breadcrumb (3rd item) with actual name
        if (index === 2 && item.label === 'Espaço') {
          return { ...item, label: spaceName };
        }
        return item;
      })
    : items;

  return (
    <nav
      className={`flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-ceramic-text-secondary/20 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {processedItems.map((item, index) => {
          const isLast = index === processedItems.length - 1;
          const truncatedLabel = truncateLabel(item.label, maxLength);

          return (
            <li key={item.path} className="flex items-center gap-2 shrink-0">
              {/* Breadcrumb Button */}
              <motion.button
                onClick={() => !isLast && navigate(item.path)}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all
                  ${
                    isLast
                      ? 'text-ceramic-text-primary font-semibold cursor-default'
                      : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-text-secondary/5'
                  }
                `}
                whileHover={isLast ? {} : { scale: 1.02 }}
                whileTap={isLast ? {} : { scale: 0.98 }}
                disabled={isLast}
                aria-current={isLast ? 'page' : undefined}
              >
                {/* Icon */}
                {item.icon && index === 0 && (
                  <Home className="w-3.5 h-3.5" />
                )}
                {item.icon && index !== 0 && (
                  <span className="text-sm" aria-hidden="true">
                    {item.icon}
                  </span>
                )}

                {/* Label */}
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  title={item.label !== truncatedLabel ? item.label : undefined}
                >
                  {truncatedLabel}
                </span>
              </motion.button>

              {/* Separator */}
              {!isLast && (
                <ChevronRight
                  className="w-3 h-3 text-ceramic-text-secondary/40 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Truncate label if it exceeds maxLength
 */
function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 3) + '...';
}

export default Breadcrumbs;
