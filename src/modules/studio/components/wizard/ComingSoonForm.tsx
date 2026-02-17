/**
 * ComingSoonForm Component
 *
 * Placeholder form for project types not yet available (video, article).
 * Shows the type icon, label, description, and "Em breve" message.
 */

import React from 'react';
import { Video, FileText } from 'lucide-react';
import type { ProjectTypeConfig } from '../../types/studio';

// ============================================================================
// TYPES
// ============================================================================

interface ComingSoonFormProps {
  typeConfig: ProjectTypeConfig;
}

// ============================================================================
// HELPERS
// ============================================================================

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Video,
  FileText,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ComingSoonForm: React.FC<ComingSoonFormProps> = ({ typeConfig }) => {
  const Icon = ICON_MAP[typeConfig.iconName];

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-ceramic-cool flex items-center justify-center">
        {Icon ? (
          <Icon className="w-8 h-8 text-ceramic-text-secondary" />
        ) : (
          <div className="w-8 h-8 rounded bg-ceramic-border" />
        )}
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-ceramic-text-primary">
          {typeConfig.label}
        </h3>
        <p className="text-sm text-ceramic-text-secondary max-w-sm">
          {typeConfig.description}
        </p>
      </div>

      <div className="px-4 py-2 rounded-full bg-ceramic-cool text-ceramic-text-secondary text-sm font-medium">
        Em breve disponivel
      </div>
    </div>
  );
};
