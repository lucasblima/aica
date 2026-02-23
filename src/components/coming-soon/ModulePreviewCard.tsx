/**
 * ModulePreviewCard — For modules in "preview" status
 * CS-002: ComingSoonModule UI
 *
 * Shows a card with semitransparent overlay indicating
 * the module is in active development.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Construction } from 'lucide-react';
import type { ModuleRegistryEntry } from '@/hooks/useModuleRegistry';

interface ModulePreviewCardProps {
  module: ModuleRegistryEntry;
  onOpen?: () => void;
}

export function ModulePreviewCard({ module, onOpen }: ModulePreviewCardProps) {
  const colorPrimary = module.color_primary || '#F59E0B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-ceramic-base shadow-ceramic-emboss cursor-pointer group"
      onClick={onOpen}
    >
      {/* Color accent stripe */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: colorPrimary }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${colorPrimary}15` }}
          >
            {module.icon_emoji || '🚀'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
              {module.name}
            </h3>
            <p className="text-xs text-ceramic-text-secondary truncate">
              {module.description}
            </p>
          </div>
        </div>

        {/* Preview badge overlay */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ceramic-warning/10 text-ceramic-warning">
          <Construction className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Preview — Em desenvolvimento</span>
        </div>

        {/* Open preview action */}
        {onOpen && (
          <button
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all group-hover:bg-ceramic-cool text-ceramic-text-secondary"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver preview
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default ModulePreviewCard;
