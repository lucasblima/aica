import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageTransitionVariants } from '@/lib/animations/ceramic-motion';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function PageShell({ children, title, onBack, rightAction, className = '' }: PageShellProps) {
  return (
    <motion.div
      className={`flex flex-col min-h-screen bg-ceramic-base pb-24 ${className}`}
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {(onBack || title || rightAction) && (
        <div className="pt-8 px-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-9 h-9 ceramic-card-flat flex items-center justify-center rounded-full"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
                </button>
              )}
              {title && (
                <h1 className="text-2xl font-bold text-ceramic-text-primary">{title}</h1>
              )}
            </div>
            {rightAction}
          </div>
        </div>
      )}
      <div className="flex-1 px-6 space-y-6">
        {children}
      </div>
    </motion.div>
  );
}
