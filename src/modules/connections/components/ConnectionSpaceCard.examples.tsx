/**
 * ConnectionSpaceCard - Usage Examples
 *
 * This file demonstrates various usage patterns for the ConnectionSpaceCard component.
 * Use these examples as templates for implementing the card in your views.
 */

import React, { useState } from 'react';
import { ConnectionSpaceCard } from './ConnectionSpaceCard';
import { ConnectionSpace } from '../types';

// ============================================
// MOCK DATA
// ============================================

const mockSpaces: ConnectionSpace[] = [
  {
    id: '1',
    user_id: 'user-123',
    archetype: 'habitat',
    name: 'Condomínio Solar',
    subtitle: 'Apartamento 302',
    description: 'Gestão completa do apartamento, despesas condominiais e manutenção.',
    icon: '🏠',
    color_theme: 'earth',
    is_active: true,
    is_favorite: true,
    last_accessed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user-123',
    archetype: 'ventures',
    name: 'AI Ventures',
    subtitle: 'Startup em crescimento',
    description: 'Dashboard executivo para acompanhamento de métricas, runway e OKRs.',
    icon: '💼',
    color_theme: 'amber',
    is_active: true,
    is_favorite: false,
    last_accessed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user-123',
    archetype: 'academia',
    name: 'Mestrado em IA',
    subtitle: 'Universidade Federal',
    description: 'Organização de pesquisas, papers e cronograma de defesa.',
    icon: '🎓',
    color_theme: 'paper',
    is_active: true,
    is_favorite: true,
    last_accessed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    user_id: 'user-123',
    archetype: 'tribo',
    name: 'Família Silva',
    subtitle: 'Reuniões e celebrações',
    description: 'Calendário familiar, álbum de fotos e organização de eventos.',
    icon: '👥',
    color_theme: 'warm',
    is_active: true,
    is_favorite: false,
    last_accessed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================
// EXAMPLE 1: Default Grid Layout
// ============================================

export function Example1_DefaultGrid() {
  const [spaces, setSpaces] = useState(mockSpaces);

  const toggleFavorite = (spaceId: string) => {
    setSpaces(prev =>
      prev.map(space =>
        space.id === spaceId
          ? { ...space, is_favorite: !space.is_favorite }
          : space
      )
    );
  };

  const handleSpaceClick = (spaceId: string) => {
    console.log('Opening space:', spaceId);
    // Navigate to space detail view
    // navigate(`/connections/${spaceId}`);
  };

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
        Meus Espaços de Conexão
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {spaces.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            onClick={() => handleSpaceClick(space.id)}
            onFavoriteToggle={() => toggleFavorite(space.id)}
            memberCount={Math.floor(Math.random() * 10) + 1} // Random for demo
            variant="default"
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 2: Compact List (Sidebar)
// ============================================

export function Example2_CompactList() {
  const favoriteSpaces = mockSpaces.filter(s => s.is_favorite);

  return (
    <div className="w-80 p-4 bg-ceramic-bg h-screen overflow-y-auto">
      <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary mb-4">
        Favoritos
      </h3>

      <div className="space-y-2">
        {favoriteSpaces.map(space => (
          <ConnectionSpaceCard
            key={space.id}
            space={space}
            variant="compact"
            onClick={() => console.log('Quick nav to', space.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 3: Archetype-Filtered View
// ============================================

export function Example3_ArchetypeFilter() {
  const [selectedArchetype, setSelectedArchetype] = useState<string>('habitat');

  const filteredSpaces = mockSpaces.filter(
    space => space.archetype === selectedArchetype
  );

  const archetypeButtons = [
    { id: 'habitat', label: 'Habitat', emoji: '🏠' },
    { id: 'ventures', label: 'Ventures', emoji: '💼' },
    { id: 'academia', label: 'Academia', emoji: '🎓' },
    { id: 'tribo', label: 'Tribo', emoji: '👥' },
  ];

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
        Explorar por Arquétipo
      </h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {archetypeButtons.map(archetype => (
          <button
            key={archetype.id}
            onClick={() => setSelectedArchetype(archetype.id)}
            className={`
              ceramic-inset px-4 py-2 text-sm font-medium whitespace-nowrap
              transition-all
              ${selectedArchetype === archetype.id ? 'ceramic-pressed' : 'hover:ceramic-elevated'}
            `}
          >
            <span className="mr-2">{archetype.emoji}</span>
            {archetype.label}
          </button>
        ))}
      </div>

      {/* Filtered results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSpaces.length > 0 ? (
          filteredSpaces.map(space => (
            <ConnectionSpaceCard
              key={space.id}
              space={space}
              variant="default"
              memberCount={5}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-ceramic-text-secondary">
              Nenhum espaço encontrado para este arquétipo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Recent Activity Dashboard
// ============================================

export function Example4_RecentActivity() {
  // Sort by last accessed (most recent first)
  const recentSpaces = [...mockSpaces].sort((a, b) => {
    const dateA = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
    const dateB = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">
          Atividade Recente
        </h2>
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Espaços acessados recentemente, ordenados por data
        </p>

        <div className="space-y-3">
          {recentSpaces.map(space => (
            <ConnectionSpaceCard
              key={space.id}
              space={space}
              variant="compact"
              lastActivity={space.last_accessed_at}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 5: Mixed Layout (Bento Grid)
// ============================================

export function Example5_BentoGrid() {
  const [favoriteSpaces] = useState(mockSpaces.filter(s => s.is_favorite));
  const [otherSpaces] = useState(mockSpaces.filter(s => !s.is_favorite));

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Favorites section - larger cards */}
        <section>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
            ⭐ Favoritos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteSpaces.map(space => (
              <ConnectionSpaceCard
                key={space.id}
                space={space}
                variant="default"
                memberCount={8}
                onFavoriteToggle={() => console.log('Toggle', space.id)}
              />
            ))}
          </div>
        </section>

        {/* Other spaces - compact list */}
        <section>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
            Outros Espaços
          </h2>
          <div className="space-y-2">
            {otherSpaces.map(space => (
              <ConnectionSpaceCard
                key={space.id}
                space={space}
                variant="compact"
                onFavoriteToggle={() => console.log('Toggle', space.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 6: Empty State
// ============================================

export function Example6_EmptyState() {
  const [spaces] = useState<ConnectionSpace[]>([]);

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
        Meus Espaços
      </h2>

      {spaces.length === 0 ? (
        <div className="ceramic-card p-12 text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Nenhum espaço ainda
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            Crie seu primeiro espaço de conexão para começar a organizar sua vida.
          </p>
          <button className="ceramic-card px-6 py-3 text-sm font-bold text-ceramic-accent hover:ceramic-elevated active:ceramic-pressed transition-all">
            Criar Espaço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
            <ConnectionSpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 7: Interactive Demo
// ============================================

export function Example7_InteractiveDemo() {
  const [spaces, setSpaces] = useState(mockSpaces);
  const [variant, setVariant] = useState<'default' | 'compact'>('default');
  const [showMemberCount, setShowMemberCount] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  const toggleFavorite = (spaceId: string) => {
    setSpaces(prev =>
      prev.map(space =>
        space.id === spaceId
          ? { ...space, is_favorite: !space.is_favorite }
          : space
      )
    );
  };

  return (
    <div className="p-6 bg-ceramic-bg min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
          Interactive Demo
        </h2>

        {/* Controls */}
        <div className="ceramic-card p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ceramic-text-secondary">
              Variant:
            </span>
            <button
              onClick={() => setVariant('default')}
              className={`ceramic-inset px-3 py-1 text-xs font-medium ${
                variant === 'default' ? 'ceramic-pressed' : ''
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setVariant('compact')}
              className={`ceramic-inset px-3 py-1 text-xs font-medium ${
                variant === 'compact' ? 'ceramic-pressed' : ''
              }`}
            >
              Compact
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ceramic-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showMemberCount}
                onChange={e => setShowMemberCount(e.target.checked)}
                className="w-4 h-4"
              />
              Show Member Count
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ceramic-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showActivity}
                onChange={e => setShowActivity(e.target.checked)}
                className="w-4 h-4"
              />
              Show Last Activity
            </label>
          </div>
        </div>

        {/* Cards */}
        <div className={variant === 'default'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-2 max-w-md'
        }>
          {spaces.map(space => (
            <ConnectionSpaceCard
              key={space.id}
              space={space}
              variant={variant}
              memberCount={showMemberCount ? 5 : undefined}
              lastActivity={showActivity ? space.last_accessed_at : undefined}
              onFavoriteToggle={() => toggleFavorite(space.id)}
              onClick={() => console.log('Clicked:', space.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 8: Responsive Layout
// ============================================

export function Example8_ResponsiveLayout() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-ceramic-bg min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-ceramic-text-primary mb-4 sm:mb-6">
          Responsive Grid
        </h2>

        {/*
          Mobile: 1 column
          Tablet: 2 columns
          Desktop: 3 columns
          Large: 4 columns
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {mockSpaces.map(space => (
            <ConnectionSpaceCard
              key={space.id}
              space={space}
              variant="default"
              memberCount={5}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Export all examples for Storybook or documentation
export const ConnectionSpaceCardExamples = {
  Example1_DefaultGrid,
  Example2_CompactList,
  Example3_ArchetypeFilter,
  Example4_RecentActivity,
  Example5_BentoGrid,
  Example6_EmptyState,
  Example7_InteractiveDemo,
  Example8_ResponsiveLayout,
};

export default ConnectionSpaceCardExamples;
