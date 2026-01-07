/**
 * Accordion Component
 * Reusable accordion for collapsible sections
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface AccordionProps {
  /** Accordion section title */
  title: string;
  /** Optional Lucide icon */
  icon?: React.ComponentType<{ className?: string }>;
  /** Section content */
  children: React.ReactNode;
  /** Whether expanded by default */
  defaultExpanded?: boolean;
  /** Optional custom class */
  className?: string;
  /** Optional ID for tracking */
  id?: string;
}

export function Accordion({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
  className = '',
  id,
}: AccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`ceramic-card overflow-hidden ${className}`} id={id}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-ceramic-text-secondary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
          )}
          <span className="font-bold text-sm text-ceramic-text-primary">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-ceramic-text-secondary transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-ceramic-text-secondary/10"
        >
          <div className="p-4 space-y-3">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default Accordion;
