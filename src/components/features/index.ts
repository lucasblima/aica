/**
 * Feature Components - Reusable features across modules
 *
 * Components that implement specific features (calendar, gamification,
 * efficiency tracking, etc.) that are used across multiple modules but
 * not tied to a single module.
 */

// prettier-ignore
export { default as AchievementsView } from './AchievementsView';
export { AgendaTimeline } from './AgendaTimeline';
export { CalendarSyncIndicator } from './CalendarSyncIndicator';
export { ConnectionArchetypes } from './ConnectionArchetypes';
// prettier-ignore
export { default as ContactCard } from './ContactCard';
export { ContactCardGrid } from './ContactCardGrid';
// prettier-ignore
export { default as ContactDetailModal } from './ContactDetailModal';
export { ContactProfileView } from './ContactProfileView';
// Aica Processing Components
export { CreditBalanceWidget } from './CreditBalanceWidget';
export { ProcessWithAicaButton } from './ProcessWithAicaButton';
export { ProcessingEstimateModal } from './ProcessingEstimateModal';
export { AnalysisResultsPanel } from './AnalysisResultsPanel';
export { DailyTimeline } from './DailyTimeline';
export { DailySummaryView } from './DailySummaryView';
// prettier-ignore
export { default as EfficiencyControlPanel } from './EfficiencyControlPanel';
export { EfficiencyMedallion } from './EfficiencyMedallion';
// prettier-ignore
export { default as EfficiencyScoreCard } from './EfficiencyScoreCard';
// prettier-ignore
export { default as EfficiencyTrendChart } from './EfficiencyTrendChart';
// prettier-ignore
export { default as GamificationWidget } from './GamificationWidget';
// prettier-ignore
export { default as GoogleCalendarConnect } from './GoogleCalendarConnect';
// prettier-ignore
export { default as GoogleCalendarEventsList } from './GoogleCalendarEventsList';
export { LifeWeeksGrid } from './LifeWeeksGrid';
// prettier-ignore
export { default as ModuleCard } from './ModuleCard';
export { NextEventHero } from './NextEventHero';
export { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from './NextTwoDaysView';
export { NotificationBell } from './NotificationBell';
// prettier-ignore
export { default as OnboardingWizard } from './OnboardingWizard';
export { PomodoroTimer } from './PomodoroTimer';
export { UnifiedJourneyCard } from './UnifiedJourneyCard';
export { WeeklyCalendarView } from './WeeklyCalendarView';

// Invite System - Viral Growth (Gmail-style)
export { InviteBadge } from './InviteBadge';
export { InviteModal } from './InviteModal';

// OpenClaw Adaptation — Life Council & Patterns
export { LifeCouncilCard } from './LifeCouncilCard';
export { PatternsSummary } from './PatternsSummary';


