/**
 * WorkspaceHeader - Header component for podcast workspace
 * Shows breadcrumb, episode title, and save status
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button + Breadcrumb */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Voltar ao dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">{showTitle}</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">
              {episodeTitle || 'Novo Episódio'}
            </span>
          </div>
        </div>

        {/* Right: Save status */}
        <div className="flex items-center space-x-3">
          {isSaving && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
              <span>Salvando...</span>
            </div>
          )}

          {!isSaving && lastSaved && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>Salvo {timeSinceLastSave}</span>
            </div>
          )}

          {!isSaving && !lastSaved && isDirty && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Save className="w-4 h-4" />
              <span>Não salvo</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
