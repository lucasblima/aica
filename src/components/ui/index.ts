/**
 * UI Primitives - Reusable, generic components without business logic
 *
 * Components in this folder are pure presentation components that can be
 * used across any module without dependencies on specific business domains.
 */

// prettier-ignore
export { default as Accordion } from './Accordion';
export { ConfirmationModal } from './ConfirmationModal';
// prettier-ignore
export { default as CeramicTabSelector } from './CeramicTabSelector';
// prettier-ignore
export { default as EmptyState } from './EmptyState';
export { FloatingActionButton } from './FloatingActionButton';
// prettier-ignore
export { default as ErrorBoundary } from './ErrorBoundary';
// prettier-ignore
export { default as LoadingScreen } from './LoadingScreen';
export { NotificationContainer } from './NotificationContainer';
// prettier-ignore
export { default as AuthLoadingScreen } from './AuthLoadingScreen';
// prettier-ignore
export { default as TagInput } from './TagInput';
// prettier-ignore
export { default as RecurrencePicker } from './RecurrencePicker';
// prettier-ignore
export { default as SubtaskList } from './SubtaskList';
export { CalendarStatusDot } from './CalendarStatusDot';

// Import UI components that were already in ui/
// prettier-ignore
export { default as BentoCard } from './BentoCard';
// prettier-ignore
export { default as CeramicPillButton } from './CeramicPillButton';
// prettier-ignore
export { default as Logo } from './Logo';
export { RelationshipScoreBadge, ScoreDot } from './RelationshipScoreBadge';
export { ContactAvatar } from './ContactAvatar';
export { StatCard } from './StatCard';
export { StatGrid } from './StatGrid';
export { MetricRow } from './MetricRow';
export { CeramicFilterTab } from './CeramicFilterTab';
export { CeramicBadge } from './CeramicBadge';
export { InfoCard } from './InfoCard';
export { MasonryGrid } from './MasonryGrid';

// Ceramic Renaissance foundation components (Issue #216)
export { PageShell } from './PageShell';
export { CeramicLoadingState } from './CeramicLoadingState';
export { CeramicErrorState } from './CeramicErrorState';
export { AIThinkingState } from './AIThinkingState';
