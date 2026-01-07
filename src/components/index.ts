/**
 * Components Index - Barrel Export
 * 
 * Re-exports all components from subcategories for backward compatibility
 * and convenient imports from @/components
 */

// ============ UI Primitives ============
export { Accordion } from './ui/Accordion';
export { CalendarStatusDot } from './ui/CalendarStatusDot';
export { CeramicPillButton } from './ui/CeramicPillButton';
export { CeramicTabSelector } from './ui/CeramicTabSelector';
export { ConfirmationModal } from './ui/ConfirmationModal';
export { EmptyState } from './ui/EmptyState';
export { ErrorBoundary } from './ui/ErrorBoundary';
export { FloatingActionButton } from './ui/FloatingActionButton';
export { LoadingScreen } from './ui/LoadingScreen';
export { NotificationContainer } from './ui/NotificationContainer';
export { AuthLoadingScreen } from './ui/AuthLoadingScreen';
export { TagInput } from './ui/TagInput';
export { RecurrencePicker } from './ui/RecurrencePicker';
export { SubtaskList } from './ui/SubtaskList';
export { BentoCard } from './ui/BentoCard';
export { Logo } from './ui/Logo';

// ============ Layout Components ============
export { AuthSheet } from './layout/AuthSheet';
export { HeaderGlobal } from './layout/HeaderGlobal';
export { Login } from './layout/Login';
export { SettingsMenu } from './layout/SettingsMenu';

// ============ Features ============
export { AchievementsView } from './features/AchievementsView';
export { AgendaTimeline } from './features/AgendaTimeline';
export { CalendarSyncIndicator } from './features/CalendarSyncIndicator';
export { ConnectionArchetypes } from './features/ConnectionArchetypes';
export { ContactCard } from './features/ContactCard';
export { ContactDetailModal } from './features/ContactDetailModal';
export { ContactProfileView } from './features/ContactProfileView';
export { DailyTimeline } from './features/DailyTimeline';
export { DailySummaryView } from './features/DailySummaryView';
export { EfficiencyControlPanel } from './features/EfficiencyControlPanel';
export { EfficiencyMedallion } from './features/EfficiencyMedallion';
export { EfficiencyScoreCard } from './features/EfficiencyScoreCard';
export { EfficiencyTrendChart } from './features/EfficiencyTrendChart';
export { GamificationWidget } from './features/GamificationWidget';
export { GoogleCalendarConnect } from './features/GoogleCalendarConnect';
export { GoogleCalendarEventsList } from './features/GoogleCalendarEventsList';
export { LifeWeeksGrid } from './features/LifeWeeksGrid';
export { ModuleCard } from './features/ModuleCard';
export { NextEventHero } from './features/NextEventHero';
export { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from './features/NextTwoDaysView';
export { OnboardingWizard } from './features/OnboardingWizard';
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
