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
import { Mic2, Video, FileText, ArrowLeft } from 'lucide-react';
import type { StudioWorkspaceProps, ProjectType } from '../types/studio';
import { generateDossier, searchGuestProfile } from '../services/podcastAIService';
import { PodcastWorkspace, ArticleWorkspace, VideoWorkspace } from '../components/workspace';
import { getProjectTypeConfig } from '../config/projectTypeConfigs';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioWorkspace');

/**
 * Unsupported project type fallback — config-aware with back navigation
 */
function UnsupportedProjectType({ type, onBack }: { type: string; onBack: () => void }) {
  const KNOWN_TYPES: ProjectType[] = ['podcast', 'video', 'article'];
  const config = KNOWN_TYPES.includes(type as ProjectType)
    ? getProjectTypeConfig(type as ProjectType)
    : null;

  const ICON_MAP: Record<string, React.FC<{ className?: string }>> = { Mic2, Video, FileText };
  const Icon = config ? (ICON_MAP[config.iconName] || FileText) : FileText;
  const label = config?.label || type;
  const description = config?.description || '';
  const stages = config?.stages || [];

  const colorMap: Record<string, { bg: string; text: string }> = {
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  };
  const colors = config ? (colorMap[config.color] || colorMap.amber) : colorMap.amber;

  return (
    <div className="flex items-center justify-center h-screen bg-ceramic-base">
      <div className="text-center max-w-md">
        <div className={`${colors.bg} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-10 h-10 ${colors.text}`} />
        </div>
        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">{label}</h2>
        <p className="text-ceramic-text-secondary mb-4">
          {description || `O tipo "${type}" ainda nao esta disponivel.`}
        </p>
        {stages.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Etapas planejadas
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {stages.map(stage => (
                <span key={stage} className="px-3 py-1 rounded-full text-xs font-medium bg-ceramic-cool text-ceramic-text-secondary capitalize">
                  {stage}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Em breve disponivel no Estudio Aica.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ceramic-cool text-ceramic-text-primary font-bold hover:bg-ceramic-border transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Biblioteca
        </button>
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
      return (
        <div data-testid="studio-workspace">
          <VideoWorkspace project={project} onBack={onBack} />
        </div>
      );

    case 'article':
      return (
        <div data-testid="studio-workspace">
          <ArticleWorkspace project={project} onBack={onBack} />
        </div>
      );

    default:
      // Fallback for unknown types
      return <UnsupportedProjectType type={project.type} onBack={onBack} />;
  }
}
