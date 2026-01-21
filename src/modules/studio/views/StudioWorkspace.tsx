/**
 * StudioWorkspace - Wrapper component that routes to specific workspace
 *
 * Based on project type, renders the appropriate workspace component.
 * This is a THIN wrapper that simply routes to the correct workspace implementation.
 *
 * MIGRATION STATUS:
 * - ✅ Wave 6 Complete: Now using migrated PodcastWorkspace from src/modules/studio/
 * - All workspace components migrated from _deprecated/ folder
 * - See: docs/architecture/STUDIO_WORKSPACE_MIGRATION.md for details
 *
 * @see PodcastWorkspace for podcast episode workspace
 * @see generateDossier for AI-powered guest research
 * @see searchGuestProfile for AI-powered guest search
 */

import React from 'react';
import type { StudioWorkspaceProps } from '../types/studio';
import { generateDossier, searchGuestProfile } from '../services/podcastAIService';
import { PodcastWorkspace } from '../components/workspace';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioWorkspace');

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
  log.debug('[StudioWorkspace] Rendering with project:', {
    id: project.id,
    type: project.type,
    title: project.title,
    showId: project.showId,
    showTitle: project.showTitle,
  });

  // Route to appropriate workspace based on project type
  switch (project.type) {
    case 'podcast':
      // Using migrated PodcastWorkspace from src/modules/studio/
      return (
        <div data-testid="studio-workspace">
          <PodcastWorkspace
            episodeId={project.id}
            showId={project.showId || ''}
            showTitle={project.showTitle || project.title}
            onBack={onBack}
            // AI service callbacks
            onGenerateDossier={async (guestName, theme, customSources) => {
              log.debug('[StudioWorkspace] Generating dossier via AI service:', { guestName, theme });
              return await generateDossier(guestName, theme, customSources);
            }}
            onSearchGuestProfile={async (name, reference) => {
              log.debug('[StudioWorkspace] Searching guest profile via AI service:', { name, reference });
              return await searchGuestProfile(name, reference);
            }}
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
