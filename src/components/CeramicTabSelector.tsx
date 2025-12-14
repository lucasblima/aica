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
 * CeramicTabSelector - Tabs com materialidade ceramic e física de deslizamento
 *
 * O indicador ativo desliza suavemente com spring physics, criando uma
 * sensação tátil de peso e inércia, como deslizar mármore em um trilho.
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
        relative flex items-center
        ceramic-inset-shallow rounded-full p-1
        bg-ceramic-cool
        ${className}
      `}
      role="tablist"
    >
      {/* Sliding indicator (ceramic-card) */}
      <motion.div
        className="
          absolute top-1 bottom-1
          ceramic-card rounded-full
          bg-ceramic-warm
        "
        style={{ width: `calc(${tabWidth}% - 4px)` }}
        animate={{
          x: `calc(${activeIndex * 100}% + ${activeIndex * 4}px)`,
        }}
        transition={springSlide}
        layoutId="tab-indicator"
      />

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative z-10 flex-1
              flex items-center justify-center gap-2
              py-2.5 px-4
              text-sm font-semibold
              rounded-full
              transition-colors duration-200
              ${isActive
                ? 'text-ceramic-text-primary'
                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }
            `}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
          >
            {tab.icon && (
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
            )}
            <span className="tracking-wide uppercase text-xs">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CeramicTabSelector;
