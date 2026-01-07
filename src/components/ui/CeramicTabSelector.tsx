import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSlide, tabLayoutTransition } from '../lib/animations/ceramic-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface CeramicTabSelectorProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/**
 * CeramicTabSelector - Tabs with tactile ceramic materiality
 *
 * Active tabs use ceramic-concave to create a "pressed" feeling,
 * following the Visual Hierarchy directive: "Navigation elements must have
 * tactile differentiation. The user must feel they have 'pressed' the destination."
 *
 * Inactive tabs are elevated (ceramic-card), active tabs are pressed (ceramic-concave).
 *
 * @example
 * ```tsx
 * <CeramicTabSelector
 *   tabs={[
 *     { id: 'personal', label: 'Pessoal' },
 *     { id: 'network', label: 'Conexões' }
 *   ]}
 *   activeTab={activeTab}
 *   onChange={setActiveTab}
 * />
 * ```
 */
export function CeramicTabSelector({
  tabs,
  activeTab,
  onChange,
  className = ''
}: CeramicTabSelectorProps) {
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const tabWidth = 100 / tabs.length;

  return (
    <div
      className={`
        relative flex items-center gap-1
        ceramic-tray rounded-full p-1.5
        ${className}
      `}
      role="tablist"
    >
      {/* Tab buttons - Tactile states */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1
              flex items-center justify-center gap-2
              py-2.5 px-4
              text-sm font-semibold
              rounded-full
              transition-all duration-200
              ${isActive
                ? 'ceramic-concave text-ceramic-text-primary' // Pressed/inset state
                : 'ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary' // Elevated state
              }
            `}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {tab.icon && (
              <motion.span
                className="transition-transform duration-200"
                animate={{ scale: isActive ? 1.1 : 1 }}
              >
                {tab.icon}
              </motion.span>
            )}
            <span className="tracking-wide uppercase text-xs font-bold">
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default CeramicTabSelector;
