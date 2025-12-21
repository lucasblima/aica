/**
 * StageRenderer - Dynamically renders the active stage component
 *
 * Uses lazy loading and AnimatePresence for smooth transitions between stages.
 * Each stage component is loaded on-demand to optimize initial bundle size.
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/components/workspace/StageRenderer.tsx
 * Wave 6: Integration - Workspace Layout Components
 *
 * Changes:
 * - Updated lazy imports to use workspace/ instead of stages/
 * - Imports from @/modules/studio/components/workspace/
 * - Type imports from @/modules/studio/types
 * - Preserved animation variants and transitions
 *
 * @see SetupStage for episode setup configuration
 * @see ResearchStage for guest research and dossier generation
 * @see PautaStage for episode script and topics management
 * @see ProductionStage for recording interface
 */

import React, { lazy } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { PodcastStageId } from '@/modules/studio/types';

interface StageRendererProps {
  currentStage: PodcastStageId;
}

// Lazy load stage components from migrated workspace location
const SetupStage = lazy(() => import('./SetupStage'));
const ResearchStage = lazy(() => import('./ResearchStage'));
const PautaStage = lazy(() => import('./PautaStage'));
const ProductionStage = lazy(() => import('./ProductionStage'));

// Animation variants for stage transitions
const stageVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

export default function StageRenderer({ currentStage }: StageRendererProps) {
  const renderStage = () => {
    switch (currentStage) {
      case 'setup':
        return <SetupStage />;
      case 'research':
        return <ResearchStage />;
      case 'pauta':
        return <PautaStage />;
      case 'production':
        return <ProductionStage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Estágio desconhecido: {currentStage}</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStage}
        variants={stageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full overflow-auto"
      >
        {renderStage()}
      </motion.div>
    </AnimatePresence>
  );
}
