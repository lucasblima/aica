/**
 * CreateConnectionModal - Usage Examples
 *
 * This file demonstrates various ways to use the CreateConnectionModal component
 * in different scenarios and configurations.
 */

import React, { useState } from 'react';
import { CreateConnectionModal } from './CreateConnectionModal';
import type { CreateSpacePayload } from '../types';
import { Plus } from 'lucide-react';

/**
 * Example 1: Basic Usage
 * Simple button that opens the modal and handles creation
 */
export function BasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    console.log('Creating space:', space);
    console.log('Invites:', invites);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    alert(`Space "${space.name}" created successfully!`);
    setIsOpen(false);
  };

  return (
    <div className="p-6">
      <button
        onClick={() => setIsOpen(true)}
        className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create New Space
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 2: With API Integration
 * Demonstrates integration with a backend API
 */
export function APIIntegrationExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call API to create space
      const response = await fetch('/api/connection-spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(space)
      });

      if (!response.ok) {
        throw new Error('Failed to create space');
      }

      const newSpace = await response.json();

      // Send member invites if provided
      if (invites && invites.length > 0) {
        await fetch(`/api/connection-spaces/${newSpace.id}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invites })
        });
      }

      console.log('Space created:', newSpace);
      setIsOpen(false);

      // Redirect or refresh
      window.location.href = `/connections/${newSpace.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating space:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error: {error}
        </div>
      )}

      <button
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
        className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50"
      >
        Create Space
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 3: With Supabase Integration
 * Demonstrates integration with Supabase backend
 */
export function SupabaseExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    try {
      // This assumes you have a Supabase client configured
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_ANON_KEY!
      );

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the space
      const { data: newSpace, error: spaceError } = await supabase
        .from('connection_spaces')
        .insert({
          user_id: user.id,
          archetype: space.archetype,
          name: space.name,
          description: space.description,
          color_theme: space.color_theme,
          icon: space.icon,
          settings: space.settings,
          is_active: true,
          is_favorite: false
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('connection_members')
        .insert({
          space_id: newSpace.id,
          user_id: user.id,
          role: 'owner',
          permissions: { all: true },
          is_active: true
        });

      if (memberError) throw memberError;

      // Send invites if provided
      if (invites && invites.length > 0) {
        const inviteRecords = invites.map(invite => ({
          space_id: newSpace.id,
          external_email: invite.email,
          role: invite.role,
          is_active: true
        }));

        const { error: inviteError } = await supabase
          .from('connection_members')
          .insert(inviteRecords);

        if (inviteError) console.error('Error sending invites:', inviteError);
      }

      console.log('Space created successfully:', newSpace);
      setIsOpen(false);

      // Navigate to new space
      window.location.href = `/connections/${newSpace.id}`;
    } catch (error) {
      console.error('Error creating space:', error);
      alert('Failed to create space. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => setIsOpen(true)}
        className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 transition-all"
      >
        Create Space
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 4: With State Management (Redux/Zustand)
 * Demonstrates integration with state management
 */
export function StateManagementExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    // Example using a hypothetical Zustand store
    // const { createSpace, addSpaceInvites } = useConnectionsStore();

    try {
      // Create space in state and backend
      // const newSpace = await createSpace(space);

      // Add invites if provided
      // if (invites && invites.length > 0) {
      //   await addSpaceInvites(newSpace.id, invites);
      // }

      console.log('Space created and added to state:', space);
      setIsOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => setIsOpen(true)}
        className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 transition-all"
      >
        Create Space
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 5: Floating Action Button Trigger
 * Modal triggered from a FAB in the corner
 */
export function FABTriggerExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    console.log('Creating space:', space);
    setIsOpen(false);
  };

  return (
    <div className="relative min-h-screen p-6">
      <h1 className="text-2xl font-bold text-ceramic-text-primary mb-4">
        My Connection Spaces
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Space cards would go here */}
        <div className="ceramic-card p-6 text-center text-ceramic-text-secondary">
          No spaces yet
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 ceramic-shadow w-16 h-16 rounded-full bg-ceramic-accent-dark text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-50"
      >
        <Plus className="w-8 h-8" />
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 6: With Analytics Tracking
 * Tracks user interactions and space creation events
 */
export function AnalyticsExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async (space: CreateSpacePayload, invites?: any[]) => {
    // Track space creation event
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Space Created', {
        archetype: space.archetype,
        has_description: !!space.description,
        has_custom_color: !!space.color_theme,
        invite_count: invites?.length || 0,
        settings_configured: Object.keys(space.settings || {}).length > 0
      });
    }

    try {
      // Create space
      console.log('Creating space with analytics:', space);

      // Track successful creation
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Space Created Successfully', {
          space_name: space.name,
          archetype: space.archetype
        });
      }

      setIsOpen(false);
    } catch (error) {
      // Track error
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Space Creation Failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  };

  const handleModalOpen = () => {
    // Track modal open
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Create Space Modal Opened');
    }
    setIsOpen(true);
  };

  const handleModalClose = () => {
    // Track modal close without completion
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Create Space Modal Closed');
    }
    setIsOpen(false);
  };

  return (
    <div className="p-6">
      <button
        onClick={handleModalOpen}
        className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 transition-all"
      >
        Create Space
      </button>

      <CreateConnectionModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onComplete={handleCreate}
      />
    </div>
  );
}

/**
 * Example 7: All Examples Showcase
 * Renders all examples in a demo page
 */
export function AllExamplesShowcase() {
  return (
    <div className="min-h-screen bg-ceramic-base p-8 space-y-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-ceramic-text-primary mb-2 text-etched">
          CreateConnectionModal Examples
        </h1>
        <p className="text-ceramic-text-secondary mb-12">
          Interactive examples demonstrating different use cases
        </p>

        <div className="space-y-12">
          <section className="ceramic-card p-6">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">
              1. Basic Usage
            </h2>
            <BasicExample />
          </section>

          <section className="ceramic-card p-6">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">
              2. API Integration
            </h2>
            <APIIntegrationExample />
          </section>

          <section className="ceramic-card p-6">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">
              3. Supabase Integration
            </h2>
            <SupabaseExample />
          </section>

          <section className="ceramic-card p-6">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">
              5. FAB Trigger
            </h2>
            <FABTriggerExample />
          </section>

          <section className="ceramic-card p-6">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">
              6. With Analytics
            </h2>
            <AnalyticsExample />
          </section>
        </div>
      </div>
    </div>
  );
}

export default AllExamplesShowcase;
