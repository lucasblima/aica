// TODO #468: Apply chat context UI pattern to Agenda
// The expanded chat uses a ChatContextSidebar (src/components/features/AicaChatFAB/ChatContextSidebar.tsx)
// that renders StatCard / ListCard components with module-specific data (tasks, finance, events).
// Data is fetched via useChatContextData (src/hooks/useChatContextData.ts) which calls
// getUserAIContext() from userAIContextService. The ContextCard component
// (src/components/ContextCard/ContextCard.tsx) is a separate hero card on Home that shows
// contextual prompts (event-based, journey-based, daily question) using the useContextSource
// hook (src/hooks/useContextSource.ts) with a 3-tier priority cascade.
//
// To unify Agenda into a single-page view (like List/Kanban/Matrix modes), consider:
// 1. Reuse ChatContextSidebar's StatCard/ListCard pattern for an Agenda context panel
// 2. Use useContextSource to surface event-based prompts inline in the Agenda timeline
// 3. The sidebar could show: upcoming events summary, task counts, calendar sync status
// Reference files:
//   - src/components/features/AicaChatFAB/ChatContextSidebar.tsx (context cards)
//   - src/components/ContextCard/ContextCard.tsx (contextual prompt hero)
//   - src/hooks/useChatContextData.ts (data fetching for chat context)
//   - src/hooks/useContextSource.ts (3-tier priority: event > journey > daily)
//   - src/services/userAIContextService.ts (AI context data aggregation)

import React from 'react';
import { AgendaPageShell } from '@/modules/agenda/components/views/AgendaPageShell';

interface AgendaViewProps {
    userId: string;
    userEmail?: string;
    onLogout: () => void;
}

/**
 * AgendaView — Thin wrapper that delegates to AgendaPageShell.
 *
 * This file exists for backward compatibility with the router.
 * All logic lives in src/modules/agenda/components/views/AgendaPageShell.tsx
 */
export const AgendaView: React.FC<AgendaViewProps> = (props) => (
    <AgendaPageShell {...props} />
);
