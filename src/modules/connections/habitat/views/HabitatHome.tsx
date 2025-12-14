/**
 * HABITAT HOME VIEW
 * Main entry point for the Habitat archetype
 * Filosofia: Âncora Físico - gestão do lar como manutenção silenciosa
 */

import React from 'react';
import { HabitatDashboard } from '../components';

interface HabitatHomeProps {
  spaceId: string;
}

/**
 * Main Habitat view - shows dashboard for property management
 */
export const HabitatHome: React.FC<HabitatHomeProps> = ({ spaceId }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <HabitatDashboard spaceId={spaceId} />
    </div>
  );
};
