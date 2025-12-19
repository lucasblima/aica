# useContextSource Hook - Usage Examples

## Overview

The `useContextSource` hook implements an intelligent 3-tier priority system for determining what contextual question/prompt to show users in the ContextCard component.

### Priority Hierarchy

1. **Event-based** (Highest Priority): Upcoming calendar events within specified time window
2. **Journey-based**: Active journey with missing required context fields
3. **Daily Question** (Fallback): AI-generated or pool-based reflective questions

## Basic Usage

```typescript
import { useContextSource } from '@/hooks/useContextSource';

function HomePage() {
  const { user } = useAuth();

  const { context, isLoading, error, refresh } = useContextSource({
    userId: user.id,
    eventLookahead: 2, // Check for events in next 2 hours
    enableAI: true, // Enable AI-generated questions
    activeJourneyId: 'health-emotional', // Optional active journey
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!context) return null; // No context available

  return (
    <ContextCard
      question={context.question}
      source={context.source}
      sourceLabel={context.sourceLabel}
      onRespond={context.onRespond}
      onDismiss={context.onDismiss}
    />
  );
}
```

## Advanced Usage

### With Manual Refresh

```typescript
function HomeView() {
  const { user } = useAuth();
  const { context, isLoading, refresh } = useContextSource({
    userId: user.id,
  });

  // Refresh context after user completes an action
  const handleTaskComplete = async () => {
    await completeTask();
    await refresh(); // Re-fetch context
  };

  return (
    <div>
      {context && (
        <ContextCard
          question={context.question}
          source={context.source}
          sourceLabel={context.sourceLabel}
          onRespond={async (response) => {
            await context.onRespond(response);
            await refresh(); // Get next priority context
          }}
          onDismiss={context.onDismiss}
        />
      )}
      <button onClick={refresh}>Refresh Context</button>
    </div>
  );
}
```

### With Multiple Active Journeys

```typescript
function DashboardView() {
  const { user } = useAuth();
  const [activeJourney, setActiveJourney] = useState('finance');

  const { context, isLoading } = useContextSource({
    userId: user.id,
    activeJourneyId: activeJourney,
    eventLookahead: 1, // Only check events in next hour
  });

  return (
    <div>
      <JourneySelector
        value={activeJourney}
        onChange={setActiveJourney}
      />

      {context && (
        <ContextCard
          question={context.question}
          source={context.source}
          sourceLabel={context.sourceLabel}
          onRespond={context.onRespond}
          onDismiss={context.onDismiss}
        />
      )}
    </div>
  );
}
```

### Handling Context Responses

```typescript
function ContextDisplay() {
  const { user } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { context, isLoading } = useContextSource({
    userId: user.id,
  });

  const handleRespond = async (response: string) => {
    try {
      await context?.onRespond(response);
      setShowConfirmation(true);

      // Hide confirmation after 2 seconds
      setTimeout(() => {
        setShowConfirmation(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save response:', error);
    }
  };

  return (
    <ContextCard
      question={context?.question || ''}
      source={context?.source || 'daily'}
      sourceLabel={context?.sourceLabel}
      onRespond={handleRespond}
      onDismiss={context?.onDismiss}
      showConfirmation={showConfirmation}
      confirmationMessage="Resposta salva!"
      isLoading={isLoading}
    />
  );
}
```

## Context Source Types

### 1. Event-based Context

Appears when a calendar event is within the lookahead window (default: 2 hours).

```typescript
{
  question: "Você tem 'Reunião com time' em 45 minutos. Como você está se preparando?",
  source: 'event',
  sourceLabel: 'Evento Próximo',
  metadata: {
    eventId: 'evt_123',
    eventTime: new Date('2025-12-18T15:00:00'),
  },
  onRespond: async (response: string) => {
    // Saves to event_responses table
  },
  onDismiss: () => {
    // Marks as dismissed, fetches next priority
  }
}
```

### 2. Journey-based Context

Appears when active journey has missing required fields.

```typescript
{
  question: "Para continuar sua trilha 'Saúde Emocional', precisamos saber: Como você está se sentindo agora?",
  source: 'journey',
  sourceLabel: 'Trilha: Saúde Emocional',
  metadata: {
    journeyId: 'health-emotional',
  },
  onRespond: async (response: string) => {
    // Saves to journey_context table
    // Updates the specific field in user's journey context
  },
  onDismiss: () => {
    // Marks as dismissed, fetches next priority
  }
}
```

### 3. Daily Question Context

Fallback when no events or blocked journeys. AI-generated or from question pool.

```typescript
{
  question: "O que você quer conquistar hoje?",
  source: 'daily',
  sourceLabel: 'Reflexão IA', // or 'Reflexão Diária'
  metadata: {
    questionId: 'ai-1734556800',
  },
  onRespond: async (response: string) => {
    // Saves to question_responses table (or logs for AI questions)
  },
  onDismiss: () => {
    // Dismisses, no more contexts available
  }
}
```

## Dismissal Behavior

The hook tracks dismissed contexts within a session:

```typescript
// First render: Shows event context
<ContextCard source="event" question="..." />

// User dismisses -> Shows journey context
<ContextCard source="journey" question="..." />

// User dismisses -> Shows daily question
<ContextCard source="daily" question="..." />

// User dismisses -> No more contexts
null
```

Dismissals are cleared on manual `refresh()`:

```typescript
const { context, refresh } = useContextSource({ userId });

// User dismisses all contexts -> null
// User clicks refresh button
await refresh(); // Clears dismissed list, re-fetches from priority 1
```

## Error Handling

```typescript
const { context, error, isLoading } = useContextSource({
  userId: user.id,
});

if (error) {
  return (
    <ErrorBanner message={`Failed to load context: ${error}`} />
  );
}

if (isLoading) {
  return <ContextCardSkeleton />;
}

if (!context) {
  return <EmptyState message="No context available" />;
}
```

## Integration with Existing Services

The hook integrates with:

1. **Daily Question Service** (`getDailyQuestionWithContext`, `saveDailyResponse`)
   - 3-tier AI question generation (AI → Journey → Pool)
   - Response persistence

2. **Journey Validation** (`useJourneyValidation`)
   - Reuses existing validation logic
   - Determines blocked state and next required field

3. **Supabase Tables**
   - `calendar_events`: Event lookups (graceful fallback if missing)
   - `event_responses`: Event response storage
   - `journey_context`: Journey field updates
   - `question_responses`: Daily question responses

## Performance Considerations

- **Caching**: Validation results are cached via `useJourneyValidation`
- **Graceful Degradation**: If `calendar_events` table doesn't exist, skips to priority 2
- **Minimal Re-renders**: Uses `useCallback` and `useMemo` patterns
- **Error Recovery**: Continues cascade on individual priority failures

## TypeScript Types

```typescript
interface ContextSource {
  question: string;
  source: 'event' | 'journey' | 'daily';
  sourceLabel: string;
  metadata?: {
    eventId?: string;
    journeyId?: string;
    questionId?: string;
    eventTime?: Date;
  };
  onRespond: (response: string) => Promise<void>;
  onDismiss: () => void;
}

interface UseContextSourceOptions {
  userId: string;
  eventLookahead?: number; // default: 2 hours
  enableAI?: boolean; // default: true
  activeJourneyId?: string;
}

interface UseContextSourceReturn {
  context: ContextSource | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

## Testing Checklist

- [ ] Event-based context shows when event exists within lookahead window
- [ ] Journey-based context shows when journey is blocked (missing required fields)
- [ ] Daily question shows as fallback when no events/blocked journeys
- [ ] Dismissed contexts don't reappear in same session
- [ ] `refresh()` clears dismissed list and re-fetches
- [ ] Hook handles missing `calendar_events` table gracefully
- [ ] `onRespond` handlers save to correct Supabase tables
- [ ] Multiple sequential dismissals cascade through all 3 priorities
- [ ] No console errors during normal operation
- [ ] Build passes without TypeScript errors
