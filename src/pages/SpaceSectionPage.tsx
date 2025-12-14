/**
 * SpaceSectionPage
 *
 * Renders a specific section of a connection space.
 * Dynamically loads the appropriate section component based on archetype and section name.
 * URL: /connections/:archetype/:spaceId/:section
 */

import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { ConnectionsLayout } from '../modules/connections/components/ConnectionsLayout';
import { useSpace } from '../modules/connections/hooks/useSpace';
import type { ArchetypeType } from '../modules/connections/types';
import { ARCHETYPE_METADATA } from '../modules/connections/types';

// ==================== HABITAT SECTIONS ====================
const HabitatInventory = lazy(() =>
  import('../modules/connections/habitat/views/InventoryView').then(m => ({ default: m.InventoryView }))
);

const HabitatMaintenance = lazy(() =>
  import('../modules/connections/habitat/views/MaintenanceView').then(m => ({ default: m.MaintenanceView }))
);

const HabitatProperty = lazy(() =>
  import('../modules/connections/habitat/views/PropertyDetail').then(m => ({ default: m.PropertyDetail }))
);

// ==================== VENTURES SECTIONS ====================
const VenturesMetrics = lazy(() =>
  import('../modules/connections/ventures/views/MetricsHistory').then(m => ({ default: m.MetricsHistory }))
);

const VenturesTeam = lazy(() =>
  import('../modules/connections/ventures/views/TeamView').then(m => ({ default: m.TeamView }))
);

const VenturesEntity = lazy(() =>
  import('../modules/connections/ventures/views/EntityDetail').then(m => ({ default: m.EntityDetail }))
);

// ==================== ACADEMIA SECTIONS ====================
const AcademiaJourneys = lazy(() =>
  import('../modules/connections/academia/views/JourneyDetail').then(m => ({ default: m.JourneyDetail }))
);

const AcademiaNotes = lazy(() =>
  import('../modules/connections/academia/views/NotesView').then(m => ({ default: m.NotesView }))
);

const AcademiaMentorships = lazy(() =>
  import('../modules/connections/academia/views/MentorshipsView').then(m => ({ default: m.MentorshipsView }))
);

const AcademiaPortfolio = lazy(() =>
  import('../modules/connections/academia/views/PortfolioView').then(m => ({ default: m.PortfolioView }))
);

// ==================== TRIBO SECTIONS ====================
const TriboRituals = lazy(() =>
  import('../modules/connections/tribo/views/RitualDetail').then(m => ({ default: m.RitualDetail }))
);

const TriboDiscussions = lazy(() =>
  import('../modules/connections/tribo/views/DiscussionsView').then(m => ({ default: m.DiscussionsView }))
);

const TriboResources = lazy(() =>
  import('../modules/connections/tribo/views/ResourcesView').then(m => ({ default: m.ResourcesView }))
);

const TriboFunds = lazy(() =>
  import('../modules/connections/tribo/views/FundsView').then(m => ({ default: m.FundsView }))
);

/**
 * Space section page - renders archetype-specific section views
 */
export function SpaceSectionPage() {
  const { archetype, spaceId, section } = useParams<{
    archetype: string;
    spaceId: string;
    section: string;
  }>();

  // Fetch space data
  const { space, loading, error } = useSpace(spaceId || '');

  // Validate archetype
  const archetypeType = archetype as ArchetypeType;
  const archetypeConfig = ARCHETYPE_METADATA[archetypeType];

  if (!archetypeConfig || !spaceId || !section) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Parâmetros inválidos
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            Arquétipo, espaço ou seção não fornecidos.
          </p>
        </div>
      </ConnectionsLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <ConnectionsLayout showBackButton spaceName="Carregando...">
        <div className="space-y-4">
          <div className="ceramic-card h-64 animate-pulse" />
        </div>
      </ConnectionsLayout>
    );
  }

  // Error state
  if (error || !space) {
    return (
      <ConnectionsLayout showBackButton>
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao carregar espaço
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-4">
            {error?.message || 'Espaço não encontrado'}
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

  // Verify archetype matches
  if (space.archetype !== archetypeType) {
    return (
      <ConnectionsLayout showBackButton spaceName={space.name}>
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

  // Render appropriate section component
  const renderSection = () => {
    switch (archetypeType) {
      case 'habitat':
        switch (section) {
          case 'inventory':
            return <HabitatInventory spaceId={spaceId} />;
          case 'maintenance':
            return <HabitatMaintenance spaceId={spaceId} />;
          case 'property':
            return <HabitatProperty spaceId={spaceId} />;
          default:
            return <SectionNotFound section={section} archetype={archetypeType} />;
        }

      case 'ventures':
        switch (section) {
          case 'metrics':
            return <VenturesMetrics />;
          case 'team':
            return <VenturesTeam />;
          case 'entity':
            return <VenturesEntity />;
          default:
            return <SectionNotFound section={section} archetype={archetypeType} />;
        }

      case 'academia':
        switch (section) {
          case 'journeys':
            return <AcademiaJourneys spaceId={spaceId} />;
          case 'notes':
            return <AcademiaNotes spaceId={spaceId} />;
          case 'mentorships':
            return <AcademiaMentorships spaceId={spaceId} />;
          case 'portfolio':
            return <AcademiaPortfolio spaceId={spaceId} />;
          default:
            return <SectionNotFound section={section} archetype={archetypeType} />;
        }

      case 'tribo':
        switch (section) {
          case 'rituals':
            return <TriboRituals spaceId={spaceId} />;
          case 'discussions':
            return <TriboDiscussions spaceId={spaceId} />;
          case 'resources':
            return <TriboResources spaceId={spaceId} />;
          case 'funds':
            return <TriboFunds spaceId={spaceId} />;
          default:
            return <SectionNotFound section={section} archetype={archetypeType} />;
        }

      default:
        return <SectionNotFound section={section} archetype={archetypeType} />;
    }
  };

  return (
    <Suspense
      fallback={
        <ConnectionsLayout showBackButton spaceName={space.name}>
          <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto ceramic-concave rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-ceramic-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-ceramic-text-secondary text-sm font-medium">
                Carregando seção...
              </p>
            </div>
          </div>
        </ConnectionsLayout>
      }
    >
      {renderSection()}
    </Suspense>
  );
}

/**
 * Section not found component
 */
function SectionNotFound({
  section,
  archetype,
}: {
  section: string;
  archetype: ArchetypeType;
}) {
  return (
    <ConnectionsLayout showBackButton>
      <div className="ceramic-card p-8 text-center">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Seção não encontrada
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          A seção "{section}" não existe para o arquétipo "{archetype}".
        </p>
      </div>
    </ConnectionsLayout>
  );
}

export default SpaceSectionPage;
