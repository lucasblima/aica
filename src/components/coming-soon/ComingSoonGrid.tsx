/**
 * ComingSoonGrid — Responsive Bento grid of all teaser modules
 * CS-002: ComingSoonModule UI
 *
 * Displays all non-live modules as teaser or preview cards.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useModuleRegistry } from '@/hooks/useModuleRegistry';
import { ComingSoonModule } from './ComingSoonModule';
import { ModulePreviewCard } from './ModulePreviewCard';
import { CeramicLoadingState } from '@/components/ui';

interface ComingSoonGridProps {
  onOpenAIPreview?: (moduleId: string) => void;
  onOpenPreview?: (moduleId: string) => void;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function ComingSoonGrid({ onOpenAIPreview, onOpenPreview }: ComingSoonGridProps) {
  const {
    modules,
    isLoading,
    isOnWaitlist,
    joinWaitlist,
    leaveWaitlist,
  } = useModuleRegistry();

  if (isLoading) {
    return <CeramicLoadingState variant="card" />;
  }

  const teaserModules = modules.filter((m) => m.status === 'teaser');
  const previewModules = modules.filter((m) => m.status === 'preview');

  if (teaserModules.length === 0 && previewModules.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Preview modules — in development */}
      {previewModules.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-3 px-1">
            Em Preview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previewModules.map((m) => (
              <motion.div key={m.id} variants={staggerItem}>
                <ModulePreviewCard
                  module={m}
                  onOpen={onOpenPreview ? () => onOpenPreview(m.id) : undefined}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Teaser modules — coming soon */}
      {teaserModules.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-3 px-1">
            Em Breve
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {teaserModules.map((m) => (
              <motion.div key={m.id} variants={staggerItem}>
                <ComingSoonModule
                  module={m}
                  isOnWaitlist={isOnWaitlist(m.id)}
                  onJoinWaitlist={() => joinWaitlist(m.id)}
                  onLeaveWaitlist={() => leaveWaitlist(m.id)}
                  onOpenAIPreview={
                    m.ai_preview_enabled && onOpenAIPreview
                      ? () => onOpenAIPreview(m.id)
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ComingSoonGrid;
