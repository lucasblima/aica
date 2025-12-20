/**
 * StudioWorkspace - Wrapper component that routes to specific workspace
 * Based on project type, renders the appropriate workspace component
 *
 * CRITICAL: This is a THIN wrapper - does NOT duplicate workspace logic
 * It simply routes to the correct workspace implementation
 *
 * MIGRATION STATUS:
 * - Currently using PodcastWorkspace from _deprecated folder
 * - TODO: Migrate workspace to src/modules/studio/ structure
 * - See: docs/architecture/STUDIO_WORKSPACE_MIGRATION.md (to be created)
 */

import React from 'react';
import type { StudioWorkspaceProps } from '../types/studio';

// TEMPORARY: Import from _deprecated until migration is complete
// eslint-disable-next-line import/no-internal-modules
import PodcastWorkspace from '../../../../_deprecated/modules/podcast/components/workspace/PodcastWorkspace';

/**
 * Unsupported project type fallback
 */
function UnsupportedProjectType({ type }: { type: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-yellow-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tipo de Projeto Não Suportado</h2>
        <p className="text-gray-600 mb-4">
          O tipo de projeto "{type}" ainda não está disponível.
        </p>
        <p className="text-sm text-gray-500">
          Em breve: Video, Article, e outros tipos de conteúdo.
        </p>
      </div>
    </div>
  );
}

/**
 * StudioWorkspace - Main workspace router
 * Routes to appropriate workspace based on project.type
 */
export default function StudioWorkspace({ project, onBack }: StudioWorkspaceProps) {
  // Debug logs
  console.log('[StudioWorkspace] Rendering with project:', {
    id: project.id,
    type: project.type,
    title: project.title,
    showId: project.showId,
    showTitle: project.showTitle,
  });

  // Route to appropriate workspace based on project type
  switch (project.type) {
    case 'podcast':
      // TEMPORARY: Using PodcastWorkspace from _deprecated
      // TODO: Migrate to src/modules/studio/components/workspace/
      return (
        <div data-testid="studio-workspace">
          <PodcastWorkspace
            episodeId={project.id}
            showId={project.showId || ''}
            showTitle={project.showTitle || project.title}
            onBack={onBack}
            // Optional callbacks for AI features
            onGenerateDossier={undefined} // TODO: Wire up AI service
            onSearchGuestProfile={undefined} // TODO: Wire up search service
          />
        </div>
      );

    case 'video':
      // Future implementation
      return <UnsupportedProjectType type="video" />;

    case 'article':
      // Future implementation
      return <UnsupportedProjectType type="article" />;

    default:
      // Fallback for unknown types
      return <UnsupportedProjectType type={project.type} />;
  }
}
