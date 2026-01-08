/**
 * Components Index - Barrel Export
 * 
 * Re-exports all components from subcategories for backward compatibility
 * and convenient imports from @/components
 */

// ============ UI Primitives ============
export { default as Accordion } from './ui/Accordion';
export { CalendarStatusDot } from './ui/CalendarStatusDot';
export { default as CeramicPillButton } from './ui/CeramicPillButton';
export { default as CeramicTabSelector } from './ui/CeramicTabSelector';
export { ConfirmationModal } from './ui/ConfirmationModal';
export { default as EmptyState } from './ui/EmptyState';
export { default as ErrorBoundary } from './ui/ErrorBoundary';
export { FloatingActionButton } from './ui/FloatingActionButton';
export { default as LoadingScreen } from './ui/LoadingScreen';
export { NotificationContainer } from './ui/NotificationContainer';
export { default as AuthLoadingScreen } from './ui/AuthLoadingScreen';
export { default as TagInput } from './ui/TagInput';
export { default as RecurrencePicker } from './ui/RecurrencePicker';
export { default as SubtaskList } from './ui/SubtaskList';
export { default as BentoCard } from './ui/BentoCard';
export { default as Logo } from './ui/Logo';

// ============ Layout Components ============
export { default as AuthSheet } from './layout/AuthSheet';
export { HeaderGlobal } from './layout/HeaderGlobal';
export { default as Login } from './layout/Login';
export { SettingsMenu } from './layout/SettingsMenu';

// ============ Features ============
export { default as AchievementsView } from './features/AchievementsView';
export { AgendaTimeline } from './features/AgendaTimeline';
export { CalendarSyncIndicator } from './features/CalendarSyncIndicator';
export { ConnectionArchetypes } from './features/ConnectionArchetypes';
export { default as ContactCard } from './features/ContactCard';
export { default as ContactDetailModal } from './features/ContactDetailModal';
export { ContactProfileView } from './features/ContactProfileView';
export { DailyTimeline } from './features/DailyTimeline';
export { DailySummaryView } from './features/DailySummaryView';
export { default as EfficiencyControlPanel } from './features/EfficiencyControlPanel';
export { EfficiencyMedallion } from './features/EfficiencyMedallion';
export { default as EfficiencyScoreCard } from './features/EfficiencyScoreCard';
export { default as EfficiencyTrendChart } from './features/EfficiencyTrendChart';
export { default as GamificationWidget } from './features/GamificationWidget';
export { default as GoogleCalendarConnect } from './features/GoogleCalendarConnect';
export { default as GoogleCalendarEventsList } from './features/GoogleCalendarEventsList';
export { LifeWeeksGrid } from './features/LifeWeeksGrid';
export { default as ModuleCard } from './features/ModuleCard';
export { NextEventHero } from './features/NextEventHero';
export { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from './features/NextTwoDaysView';
export { default as OnboardingWizard } from './features/OnboardingWizard';
export { PomodoroTimer } from './features/PomodoroTimer';
export { UnifiedJourneyCard } from './features/UnifiedJourneyCard';
export { WeeklyCalendarView } from './features/WeeklyCalendarView';

// ============ Domain-Specific ============
export { EmptyQuadrantState } from './domain/EmptyQuadrantState';
export { PriorityMatrix } from './domain/PriorityMatrix';
export { TaskCreationQuickAdd } from './domain/TaskCreationQuickAdd';
export { TaskEditModal } from './domain/TaskEditModal';

// ============ Legacy Organization (keeping for gradual migration) ============
// These will be moved to appropriate subdirectories in future sprints
export { default as AreaQuickActionModal } from './AreaQuickActionModal';
export { default as ContextCard } from './ContextCard';
export { default as EfficiencyFlowCard } from './EfficiencyFlowCard';
export { default as IdentityPassport } from './IdentityPassport';
export { default as ModuleTray } from './ModuleTray';
export { default as ProfileModal } from './ProfileModal';
export { default as RecentContactsWidget } from './RecentContactsWidget';
export { default as VitalStatsTray } from './VitalStatsTray';
