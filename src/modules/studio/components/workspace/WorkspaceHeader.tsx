/**
 * WorkspaceHeader - Header component for podcast workspace
 *
 * Shows breadcrumb navigation, episode title, and auto-save status indicator.
 * Provides a back button to return to the studio library/dashboard.
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/components/workspace/WorkspaceHeader.tsx
 * Wave 6: Integration - Workspace Layout Components
 *
 * Changes:
 * - Applied Ceramic Design System classes
 * - Enhanced accessibility with aria-labels
 * - Improved save status visual feedback
 * - Maintained time calculation logic
 *
 * Accessibility Features:
 * - aria-label on back button
 * - Visual and text feedback for save states
 * - Screen reader friendly time descriptions
 *
 * Design System: Ceramic Design System
 * - Surface: bg-white
 * - Text: text-ceramic-primary, text-ceramic-secondary
 * - Borders: border-ceramic-border
 * - Interactive: hover states with ceramic colors
 *
 * @see PodcastWorkspace for parent component
 */

import React, { useMemo } from 'react';
import { ArrowLeft, Save, Check } from 'lucide-react';

interface WorkspaceHeaderProps {
  showTitle: string;
  episodeTitle: string;
  lastSaved: Date | null;
  isSaving: boolean;
  isDirty: boolean;
  onBack: () => void;
}

export default function WorkspaceHeader({
  showTitle,
  episodeTitle,
  lastSaved,
  isSaving,
  isDirty,
  onBack,
}: WorkspaceHeaderProps) {
  // Calculate time since last save
  const timeSinceLastSave = useMemo(() => {
    if (!lastSaved) return null;

    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h atrás`;
    } else if (minutes > 0) {
      return `${minutes}min atrás`;
    } else if (seconds > 5) {
      return `${seconds}s atrás`;
    } else {
      return 'agora mesmo';
    }
  }, [lastSaved]);

  return (
    <header className="bg-white border-b border-ceramic-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button + Breadcrumb */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-ceramic-secondary hover:text-ceramic-primary transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg px-2 py-1"
            aria-label="Voltar ao dashboard do estúdio"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-ceramic-secondary">{showTitle}</span>
            <span className="text-ceramic-border">/</span>
            <span className="font-semibold text-ceramic-primary">
              {episodeTitle || 'Novo Episódio'}
            </span>
          </div>
        </div>

        {/* Right: Save status */}
        <div className="flex items-center space-x-3">
          {isSaving && (
            <div
              className="flex items-center space-x-2 text-sm text-ceramic-secondary"
              role="status"
              aria-live="polite"
              aria-label="Salvando alterações"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" aria-hidden="true" />
              <span>Salvando...</span>
            </div>
          )}

          {!isSaving && lastSaved && (
            <div
              className="flex items-center space-x-2 text-sm text-ceramic-secondary"
              role="status"
              aria-live="polite"
              aria-label={`Salvo ${timeSinceLastSave}`}
            >
              <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
              <span>Salvo {timeSinceLastSave}</span>
            </div>
          )}

          {!isSaving && !lastSaved && isDirty && (
            <div
              className="flex items-center space-x-2 text-sm text-ceramic-tertiary"
              role="status"
              aria-live="polite"
              aria-label="Alterações não salvas"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Não salvo</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
