/**
 * SpaceDetailPage
 *
 * Renders the detail/home view for a specific connection space.
 * Dynamically loads the appropriate archetype home component.
 * URL: /connections/:archetype/:spaceId
 */

import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { ConnectionsLayout } from '../modules/connections/components/ConnectionsLayout';
import { useSpace } from '../modules/connections/hooks/useSpace';
import type { ArchetypeType } from '../modules/connections/types';
import { ARCHETYPE_METADATA } from '../modules/connections/types';

// Lazy load archetype home components
const HabitatHome = lazy(() =>
  import('../modules/connections/habitat/views/HabitatHome').then(m => ({ default: m.HabitatHome }))
);

const VenturesHome = lazy(() =>
  import('../modules/connections/ventures/views/VenturesHome').then(m => ({ default: m.VenturesHome }))
);

const AcademiaHome = lazy(() =>
  import('../modules/connections/academia/views/AcademiaHome').then(m => ({ default: m.AcademiaHome }))
);

const TriboHome = lazy(() =>
  import('../modules/connections/tribo/views/TriboHome').then(m => ({ default: m.TriboHome }))
);

/**
 * Space detail page - renders archetype-specific home view
 */
export function SpaceDetailPage() {
  const { archetype, spaceId } = useParams<{ archetype: string; spaceId: string }>();

  // Fetch space data
  const { space, loading, error } = useSpace(spaceId || '');

  // Validate archetype
  const archetypeType = archetype as ArchetypeType;
  const archetypeConfig = ARCHETYPE_METADATA[archetypeType];

  if (!archetypeConfig) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Arquétipo não encontrado
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            O arquétipo "{archetype}" não existe.
          </p>
        </div>
      </ConnectionsLayout>
    );
  }

  if (!spaceId) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Espaço não encontrado
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            ID do espaço não fornecido.
          </p>
        </div>
      </ConnectionsLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <ConnectionsLayout
        showBackButton
        spaceName="Carregando..."
      >
        <div className="space-y-4">
          <div className="ceramic-card h-32 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="ceramic-card h-48 animate-pulse" />
            <div className="ceramic-card h-48 animate-pulse" />
          </div>
        </div>
      </ConnectionsLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao carregar espaço
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-4">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="ceramic-card px-6 py-2 text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform"
          >
            Tentar novamente
          </button>
        </div>
      </ConnectionsLayout>
    );
  }

  // Space not found
  if (!space) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Espaço não encontrado
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            O espaço solicitado não existe ou você não tem permissão para acessá-lo.
          </p>
        </div>
      </ConnectionsLayout>
    );
  }

  // Verify archetype matches
  if (space.archetype !== archetypeType) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Arquétipo incompatível
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            Este espaço pertence ao arquétipo "{space.archetype}", não "{archetypeType}".
          </p>
        </div>
      </ConnectionsLayout>
    );
  }

  // Render appropriate archetype home component
  const renderArchetypeHome = () => {
    switch (archetypeType) {
      case 'habitat':
        return <HabitatHome spaceId={spaceId} />;
      case 'ventures':
        return <VenturesHome />;
      case 'academia':
        return <AcademiaHome spaceId={spaceId} />;
      case 'tribo':
        return <TriboHome spaceId={spaceId} />;
      default:
        return (
          <div className="ceramic-card p-8 text-center">
            <p className="text-sm text-ceramic-text-secondary">
              Componente não implementado para arquétipo "{archetypeType}"
            </p>
          </div>
        );
    }
  };

  return (
    <Suspense
      fallback={
        <ConnectionsLayout
          showBackButton
          spaceName={space.name}
        >
          <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto ceramic-concave rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-ceramic-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-ceramic-text-secondary text-sm font-medium">
                Carregando {archetypeConfig.name}...
              </p>
            </div>
          </div>
        </ConnectionsLayout>
      }
    >
      {renderArchetypeHome()}
    </Suspense>
  );
}

export default SpaceDetailPage;
