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
import type { ConnectionSpace } from '../modules/connections/types';

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

  const handleNavigateToSpace = (spaceId: string) => {
    // Note: We need to fetch the space to get its archetype
    // For now, we'll pass a placeholder and rely on the detail page to handle it
    // In a real implementation, you'd fetch the space data here
    console.log('[ConnectionsPage] Navigating to space:', spaceId);
  };

  const handleCreateSpace = () => {
    setShowCreateWizard(true);
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
        onClose={() => setShowCreateWizard(false)}
        onComplete={handleSpaceCreated}
      />
    </>
  );
}

export default ConnectionsPage;
