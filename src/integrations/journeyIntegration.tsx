/**
 * Journey Module Integration
 * Instructions for integrating Minha Jornada into App.tsx
 */

import { JourneyCardCollapsed, JourneyFullScreen } from '../modules/journey'

/**
 * STEP 1: Add 'journey' to ViewState type in App.tsx
 *
 * Change:
 *   type ViewState = 'vida' | 'agenda' | 'association_detail' | 'podcast' | 'finance' | 'finance_agent';
 *
 * To:
 *   type ViewState = 'vida' | 'agenda' | 'association_detail' | 'podcast' | 'finance' | 'finance_agent' | 'journey';
 */

/**
 * STEP 2: Add JourneyCardCollapsed to the "Vida" dashboard
 *
 * In the renderVida() function, add this card to the grid:
 *
 * <motion.div
 *   variants={cardVariants}
 *   initial="hidden"
 *   animate="visible"
 *   custom={5}
 *   className="ceramic-card p-0 overflow-hidden"
 * >
 *   <JourneyCardCollapsed />
 * </motion.div>
 */

/**
 * STEP 3: Add renderJourney function
 *
 * Add this function alongside other render functions (renderAgenda, renderPodcast, etc):
 */
export function renderJourney() {
  return <JourneyFullScreen />
}

/**
 * STEP 4: Add view rendering
 *
 * In the main return statement, add after finance_agent:
 *
 * {currentView === 'journey' && renderJourney()}
 */

/**
 * COMPLETE INTEGRATION CODE
 * Copy and paste this into App.tsx:
 */

/*
// At the top with other imports:
import { JourneyCardCollapsed, JourneyFullScreen } from './src/modules/journey';

// In the type definition:
type ViewState = 'vida' | 'agenda' | 'association_detail' | 'podcast' | 'finance' | 'finance_agent' | 'journey';

// In renderVida(), add to the grid:
<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  custom={5}
  className="ceramic-card p-0 overflow-hidden"
>
  <JourneyCardCollapsed />
</motion.div>

// Add this render function:
const renderJourney = () => {
  return <JourneyFullScreen />;
};

// In the main return, add after finance_agent:
{currentView === 'journey' && renderJourney()}
*/
