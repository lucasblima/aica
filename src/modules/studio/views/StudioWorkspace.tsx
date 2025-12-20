/**
 * StudioWorkspace - Wrapper component that routes to specific workspace
 * Based on project type, renders the appropriate workspace component
 *
 * CRITICAL: This is a THIN wrapper - does NOT duplicate workspace logic
 * It simply routes to the correct workspace implementation
 *
 * MIGRATION STATUS:
 * - PodcastWorkspace is being migrated from _deprecated
 * - Temporary placeholder shown until migration is complete
 */

import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import type { StudioWorkspaceProps } from '../types/studio';

/**
 * Temporary placeholder for workspace implementation
 * Shows while workspace is being migrated from _deprecated
 */
function WorkspacePlaceholder({ project, onBack }: StudioWorkspaceProps) {
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-ceramic-base border-b border-ceramic-text-tertiary/20 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="ceramic-card p-2 rounded-xl hover:scale-105 transition-transform"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-ceramic-text-primary">
              {project.title}
            </h1>
            <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
              {project.showTitle}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="ceramic-inset inline-flex p-8 rounded-3xl mb-6">
            <Wrench className="w-12 h-12 text-ceramic-text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-ceramic-text-primary mb-3">
            Workspace em Desenvolvimento
          </h2>
          <p className="text-ceramic-text-secondary mb-6">
            O workspace do {project.type} está sendo migrado para a nova arquitetura.
            Em breve você poderá editar episódios diretamente aqui.
          </p>
          <button
            onClick={onBack}
            className="ceramic-card px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Studio
          </button>
        </div>
      </main>
    </div>
  );
}

/**
 * Unsupported project type fallback
 */
function UnsupportedProjectType({ type, onBack }: { type: string; onBack: () => void }) {
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="ceramic-inset inline-flex p-8 rounded-3xl mb-6">
            <svg className="w-12 h-12 text-ceramic-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ceramic-text-primary mb-3">
            Tipo de Projeto Não Suportado
          </h2>
          <p className="text-ceramic-text-secondary mb-6">
            O tipo de projeto "{type}" ainda não está disponível.
          </p>
          <p className="text-sm text-ceramic-text-tertiary mb-6">
            Em breve: Video, Article, e outros tipos de conteúdo.
          </p>
          <button
            onClick={onBack}
            className="ceramic-card px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Studio
          </button>
        </div>
      </main>
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
      // TODO: Replace with actual PodcastWorkspace when migration is complete
      return (
        <div data-testid="studio-workspace">
          <WorkspacePlaceholder project={project} onBack={onBack} />
        </div>
      );

    case 'video':
      // Future implementation
      return <UnsupportedProjectType type="video" onBack={onBack} />;

    case 'article':
      // Future implementation
      return <UnsupportedProjectType type="article" onBack={onBack} />;

    default:
      // Fallback for unknown types
      return <UnsupportedProjectType type={project.type} onBack={onBack} />;
  }
}
