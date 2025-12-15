/**
 * StageRenderer - Renders the appropriate stage component based on current stage
 */

import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { StageId } from '../../types/workspace';

// Lazy load stage components for better code splitting
const ContextStage = lazy(() => import('../stages/ContextStage'));
const StructureStage = lazy(() => import('../stages/StructureStage'));
const DraftingStage = lazy(() => import('../stages/DraftingStage'));
const DocsStage = lazy(() => import('../stages/DocsStage'));
const TimelineStage = lazy(() => import('../stages/TimelineStage'));

interface StageRendererProps {
  currentStage: StageId;
}

/**
 * Loading fallback component
 */
const StageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
      <span className="text-sm text-[#948D82]">Carregando...</span>
    </div>
  </div>
);

/**
 * Animation variants for stage transitions
 */
const stageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -20,
  },
};

export const StageRenderer: React.FC<StageRendererProps> = ({ currentStage }) => {
  const renderStageContent = () => {
    switch (currentStage) {
      case 'setup':
        return <ContextStage />;
      case 'structure':
        return <StructureStage />;
      case 'drafting':
        return <DraftingStage />;
      case 'docs':
        return <DocsStage />;
      case 'timeline':
        return <TimelineStage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
        <Suspense fallback={<StageLoadingFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              variants={stageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {renderStageContent()}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>
    </div>
  );
};

export default StageRenderer;
