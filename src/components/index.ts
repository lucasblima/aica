/**
 * Components Index - Barrel Export
 * 
 * Re-exports all components from subcategories for backward compatibility
 * and convenient imports from @/components
 */

// ============ UI Primitives ============
// prettier-ignore
export { default as Accordion } from './ui/Accordion';
export { CalendarStatusDot } from './ui/CalendarStatusDot';
// prettier-ignore
export { default as CeramicPillButton } from './ui/CeramicPillButton';
// prettier-ignore
export { default as CeramicTabSelector } from './ui/CeramicTabSelector';
export { ConfirmationModal } from './ui/ConfirmationModal';
// prettier-ignore
export { default as EmptyState } from './ui/EmptyState';
// prettier-ignore
export { default as ErrorBoundary } from './ui/ErrorBoundary';
export { FloatingActionButton } from './ui/FloatingActionButton';
// prettier-ignore
export { default as LoadingScreen } from './ui/LoadingScreen';
export { CeramicLoadingState } from './ui/CeramicLoadingState';
export { NotificationContainer } from './ui/NotificationContainer';
// prettier-ignore
export { default as AuthLoadingScreen } from './ui/AuthLoadingScreen';
// prettier-ignore
export { default as TagInput } from './ui/TagInput';
// prettier-ignore
export { default as RecurrencePicker } from './ui/RecurrencePicker';
// prettier-ignore
export { default as SubtaskList } from './ui/SubtaskList';
// prettier-ignore
export { default as BentoCard } from './ui/BentoCard';
// prettier-ignore
export { default as Logo } from './ui/Logo';
export { BottomNav } from './layout/BottomNav';

// ============ Layout Components ============
// prettier-ignore
export { default as AuthSheet } from './layout/AuthSheet';
export { HeaderGlobal } from './layout/HeaderGlobal';
// prettier-ignore
export { default as Login } from './layout/Login';
export { SettingsMenu } from './layout/SettingsMenu';
export { HelpButton } from './layout/HelpButton';

// ============ Features ============
// prettier-ignore
export { default as AchievementsView } from './features/AchievementsView';
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { AgendaTimeline } from '@/modules/agenda/components/calendar/AgendaTimeline';
export { CalendarSyncIndicator } from './features/CalendarSyncIndicator';
export { ConnectionArchetypes } from './features/ConnectionArchetypes';
// prettier-ignore
export { default as ContactCard } from './features/ContactCard';
export { ContactCardGrid } from './features/ContactCardGrid';
export { CreditBalanceWidget } from './features/CreditBalanceWidget';
export { InviteModal } from './features/InviteModal';
export { InviteShareCard } from './features/InviteShareCard';
// prettier-ignore
export { default as ContactDetailModal } from './features/ContactDetailModal';
export { ContactProfileView } from './features/ContactProfileView';
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { DailyTimeline } from '@/modules/agenda/components/calendar/DailyTimeline';
export { DailySummaryView } from './features/DailySummaryView';
// prettier-ignore
export { default as EfficiencyControlPanel } from './features/EfficiencyControlPanel';
export { EfficiencyMedallion } from './features/EfficiencyMedallion';
// prettier-ignore
export { default as EfficiencyScoreCard } from './features/EfficiencyScoreCard';
// prettier-ignore
export { default as EfficiencyTrendChart } from './features/EfficiencyTrendChart';
// prettier-ignore
export { default as GoogleCalendarConnect } from './features/GoogleCalendarConnect';
// prettier-ignore
export { default as GoogleCalendarEventsList } from './features/GoogleCalendarEventsList';
export { LifeWeeksGrid } from './features/LifeWeeksGrid';
// prettier-ignore
export { default as ModuleCard } from './features/ModuleCard';
export { ExploreMoreSection } from './features/ExploreMoreSection';
export { NextEventHero } from './features/NextEventHero';
export { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from './features/NextTwoDaysView';
// prettier-ignore
export { default as OnboardingWizard } from './features/OnboardingWizard';
export { PomodoroTimer } from './features/PomodoroTimer';
export { UnifiedJourneyCard } from './features/UnifiedJourneyCard';
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { WeeklyCalendarView } from '@/modules/agenda/components/calendar/WeekView';

// Scientific Scoring Engine — Issue #575
export { ScoreCard } from './features/ScoreCard';
export { ScoreExplainer } from './features/ScoreExplainer';
export { DomainWeightSliders } from './features/DomainWeightSliders';

// ============ Domain-Specific ============
// Migrated to @/modules/agenda/components/ (re-exports for backward compat)
export { AgendaModeToggle } from '@/modules/agenda/components/shared/ModeToggle';
export { EmptyQuadrantState } from './domain/EmptyQuadrantState';
export { PriorityMatrix } from '@/modules/agenda/components/views/MatrixView';
export { TaskCreationQuickAdd } from '@/modules/agenda/components/editors/QuickAdd';
export { TaskEditModal } from '@/modules/agenda/components/editors/TaskEditModal';
export { TaskEditDrawer } from './domain/TaskEditDrawer';
export { TaskListView } from '@/modules/agenda/components/views/ListView';
export { TaskKanbanView } from '@/modules/agenda/components/views/KanbanView';
export { TaskFilterBar } from '@/modules/agenda/components/shared/FilterBar';

// ============ Legacy Organization (keeping for gradual migration) ============
// These will be moved to appropriate subdirectories in future sprints
export { default as AreaQuickActionModal } from './AreaQuickActionModal';
export { default as ContextCard } from './ContextCard';
export { default as EfficiencyFlowCard } from './EfficiencyFlowCard';
export { default as IdentityPassport } from './IdentityPassport';
export { default as ModuleTray } from './ModuleTray';
export { default as ProfileModal } from './ProfileModal';
export { ProfileDrawer } from './ProfileModal';
export { default as RecentContactsWidget } from './RecentContactsWidget';
export { default as VitalStatsTray } from './VitalStatsTray';
