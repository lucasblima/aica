# useContextSource Hook - Quick Reference

## Import
```typescript
import { useContextSource } from '@/hooks/useContextSource';
```

## Basic Usage
```typescript
const { context, isLoading, error, refresh } = useContextSource({
  userId: user.id,
});
```

## Options
```typescript
interface UseContextSourceOptions {
  userId: string;              // Required: User ID
  eventLookahead?: number;     // Optional: Hours ahead (default: 2)
  enableAI?: boolean;          // Optional: Enable AI questions (default: true)
  activeJourneyId?: string;    // Optional: Active journey ID
}
```

## Return Value
```typescript
interface UseContextSourceReturn {
  context: ContextSource | null;  // Current context or null
  isLoading: boolean;              // Loading state
  error: string | null;            // Error message or null
  refresh: () => Promise<void>;    // Manual refresh function
}
```

## Context Structure
```typescript
interface ContextSource {
  question: string;                // Question to display
  source: 'event' | 'journey' | 'daily';  // Context type
  sourceLabel: string;             // Display label
  metadata?: {
    eventId?: string;
    journeyId?: string;
    questionId?: string;
    eventTime?: Date;
  };
  onRespond: (response: string) => Promise<void>;  // Response handler
  onDismiss: () => void;           // Dismiss handler
}
```

## Priority System

1. **Event** - Upcoming calendar events (within lookahead window)
2. **Journey** - Blocked journeys with missing required fields
3. **Daily** - AI-generated or pool questions (fallback)

## Common Patterns

### With ContextCard
```typescript
{context && (
  <ContextCard
    question={context.question}
    source={context.source}
    sourceLabel={context.sourceLabel}
    onRespond={context.onRespond}
    onDismiss={context.onDismiss}
  />
)}
```

### With Loading State
```typescript
{isLoading && <Skeleton />}
{error && <ErrorBanner message={error} />}
{context && <ContextCard {...context} />}
```

### With Manual Refresh
```typescript
const handleRefresh = async () => {
  await refresh();
};

<button onClick={handleRefresh}>Refresh</button>
```

## Behavior Notes

- Dismissed contexts don't reappear in same session
- Dismissing triggers automatic fetch of next priority
- Manual `refresh()` clears dismissed list
- Gracefully handles missing calendar_events table
- All responses saved to appropriate Supabase tables

## Files
- **Hook**: `src/hooks/useContextSource.ts`
- **Examples**: `src/hooks/useContextSource.example.md`
- **Completion Report**: `TRACK_3_CONTEXT_HOOK_COMPLETION.md`
