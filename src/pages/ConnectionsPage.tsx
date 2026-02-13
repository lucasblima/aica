import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionsView } from '../modules/connections/views/ConnectionsView';
import { CreateSpaceDrawer } from '../modules/connections/components/CreateSpaceDrawer';
import { useAuth } from '../hooks/useAuth';
import type { ConnectionSpace, ArchetypeType } from '../modules/connections/types';

export function ConnectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeType | undefined>(undefined);

  const handleNavigateToSpace = (spaceId: string) => {
    navigate(`/connections/${spaceId}`);
  };

  const handleCreateSpace = (archetype?: ArchetypeType) => {
    setSelectedArchetype(archetype);
    setShowCreateModal(true);
  };

  const handleSpaceCreated = (space: ConnectionSpace) => {
    navigate(`/connections/${space.id}`);
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

      <CreateSpaceDrawer
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedArchetype(undefined);
        }}
        onComplete={handleSpaceCreated}
        initialArchetype={selectedArchetype}
      />
    </>
  );
}

export default ConnectionsPage;
