/**
 * ArchetypeListPage
 *
 * Lists all spaces for a specific archetype.
 * URL: /connections/:archetype
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ConnectionsLayout } from '../modules/connections/components/ConnectionsLayout';
import { CreateSpaceWizard } from '../modules/connections/components/CreateSpaceWizard';
import { SpaceCard } from '../modules/connections/components/SpaceCard';
import { useSpaces } from '../modules/connections/hooks/useSpaces';
import { useConnectionNavigation } from '../modules/connections/hooks/useConnectionNavigation';
import { ARCHETYPE_METADATA, type ArchetypeType, type ConnectionSpace } from '../modules/connections/types';
import { staggerContainer, staggerItem } from '../lib/animations/ceramic-motion';

/**
 * Page showing all spaces for a specific archetype
 */
export function ArchetypeListPage() {
  const { archetype } = useParams<{ archetype: string }>();
  const { navigateToSpace } = useConnectionNavigation();
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Validate archetype
  const archetypeType = archetype as ArchetypeType;
  const archetypeConfig = ARCHETYPE_METADATA[archetypeType];

  // Fetch spaces for this archetype
  const { spaces, loading, error, toggleFavorite } = useSpaces({
    archetype: archetypeType,
    autoFetch: true,
  });

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

  const handleNavigateToSpace = (spaceId: string) => {
    navigateToSpace(spaceId, archetypeType);
  };

  const handleSpaceCreated = (space: ConnectionSpace) => {
    console.log('[ArchetypeListPage] Space created:', space);
    navigateToSpace(space.id, space.archetype);
  };

  const handleToggleFavorite = async (spaceId: string) => {
    try {
      await toggleFavorite(spaceId);
    } catch (err) {
      console.error('[ArchetypeListPage] Error toggling favorite:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <ConnectionsLayout
        title={archetypeConfig.name}
        subtitle={archetypeConfig.subtitle}
        showBackButton
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ceramic-card h-48 animate-pulse" />
          ))}
        </div>
      </ConnectionsLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ConnectionsLayout
        title={archetypeConfig.name}
        subtitle={archetypeConfig.subtitle}
        showBackButton
      >
        <div className="ceramic-card p-8 text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao carregar espaços
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

  return (
    <>
      <ConnectionsLayout
        title={archetypeConfig.name}
        subtitle={archetypeConfig.subtitle}
        showBackButton
        headerActions={
          <button
            onClick={() => setShowCreateWizard(true)}
            className="ceramic-card w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            aria-label="Criar novo espaço"
          >
            <Plus className="w-5 h-5 text-ceramic-accent" />
          </button>
        }
      >
        {/* Description */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-ceramic-text-secondary">
            {archetypeConfig.description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-ceramic-text-secondary/60">
            <span>{archetypeConfig.designCues.tone}</span>
          </div>
        </motion.div>

        {/* Empty state */}
        {spaces.length === 0 ? (
          <motion.div
            className="ceramic-tray p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-4">{archetypeConfig.icon}</div>
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
              Nenhum espaço {archetypeConfig.name}
            </h3>
            <p className="text-sm text-ceramic-text-secondary mb-6 max-w-md mx-auto">
              Crie seu primeiro espaço {archetypeConfig.name} para começar.
            </p>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="ceramic-card px-6 py-3 text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar espaço
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <motion.div
              className="mb-6 flex items-center gap-2 text-xs text-ceramic-text-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <span className="font-bold">
                {spaces.length} {spaces.length === 1 ? 'espaço' : 'espaços'}
              </span>
              <span className="text-ceramic-text-secondary/40">•</span>
              <span>
                {spaces.filter((s) => s.is_favorite).length} favoritos
              </span>
            </motion.div>

            {/* Spaces Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {spaces.map((space) => (
                <motion.div key={space.id} variants={staggerItem}>
                  <SpaceCard
                    space={space}
                    variant="full"
                    showFavorite
                    onClick={() => handleNavigateToSpace(space.id)}
                    onToggleFavorite={() => handleToggleFavorite(space.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </ConnectionsLayout>

      {/* Create Space Wizard */}
      <CreateSpaceWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onComplete={handleSpaceCreated}
        initialArchetype={archetypeType}
      />
    </>
  );
}

export default ArchetypeListPage;
