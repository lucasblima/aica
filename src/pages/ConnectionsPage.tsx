/**
 * ConnectionsPage
 *
 * Main entry point for the Connections module.
 * Lists all connection archetypes, recent spaces, and provides access to creation wizard.
 */

import React, { useState } from 'react';
import { ConnectionsView } from '../modules/connections/views/ConnectionsView';
import { CreateSpaceWizard } from '../modules/connections/components/CreateSpaceWizard';
import { useConnectionNavigation } from '../modules/connections/hooks/useConnectionNavigation';
import { useAuth } from '../hooks/useAuth';
import type { ConnectionSpace, Archetype } from '../modules/connections/types';

/**
 * Main Connections page
 *
 * Features:
 * - Grid of 4 archetype cards (Habitat, Ventures, Academia, Tribo)
 * - Recent/favorite spaces
 * - Quick stats
 * - Create space wizard modal
 */
export function ConnectionsPage() {
  const { user } = useAuth();
  const { navigateToSpace } = useConnectionNavigation();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | undefined>(undefined);

  const handleNavigateToSpace = (spaceId: string, archetype: string) => {
    navigateToSpace(spaceId, archetype as any);
  };

  const handleCreateSpace = (archetype?: Archetype) => {
    setSelectedArchetype(archetype);
    setShowCreateWizard(true);
  };

  const handleCloseWizard = () => {
    setShowCreateWizard(false);
    setSelectedArchetype(undefined);
  };

  const handleSpaceCreated = (space: ConnectionSpace) => {
    console.log('[ConnectionsPage] Space created:', space);
    // Navigate to the newly created space
    navigateToSpace(space.id, space.archetype);
  };

  if (!user?.id) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
        <div className="ceramic-card p-8 max-w-md text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Autenticação necessária
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            Faça login para acessar suas conexões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConnectionsView
        userId={user.id}
        onNavigateToSpace={handleNavigateToSpace}
        onCreateSpace={handleCreateSpace}
      />

      {/* Create Space Wizard Modal */}
      <CreateSpaceWizard
        isOpen={showCreateWizard}
        onClose={handleCloseWizard}
        onComplete={handleSpaceCreated}
        initialArchetype={selectedArchetype}
      />
    </>
  );
}

export default ConnectionsPage;
