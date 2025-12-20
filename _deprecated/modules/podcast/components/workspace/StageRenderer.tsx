/**
 * StageRenderer - Dynamically renders the active stage component
 * Uses lazy loading and AnimatePresence for smooth transitions
 */

import React, { lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PodcastStageId } from '../../types/workspace';

interface StageRendererProps {
  currentStage: PodcastStageId;
}

// Lazy load stage components
// TODO: Replace placeholders with actual stage components in Phase 2
const SetupStage = lazy(() => import('../stages/SetupStage'));
const ResearchStage = lazy(() => import('../stages/ResearchStage'));
const PautaStage = lazy(() => import('../stages/PautaStage'));
const ProductionStage = lazy(() => import('../stages/ProductionStage'));

// Animation variants for stage transitions
const stageVariants = {
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
