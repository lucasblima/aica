/**
 * Feature Components - Reusable features across modules
 *
 * Components that implement specific features (calendar, gamification,
 * efficiency tracking, etc.) that are used across multiple modules but
 * not tied to a single module.
 */

// prettier-ignore
export { default as AchievementsView } from './AchievementsView';
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { AgendaTimeline } from '@/modules/agenda/components/calendar/AgendaTimeline';
export { CalendarSyncIndicator } from './CalendarSyncIndicator';
export { ConnectionArchetypes } from './ConnectionArchetypes';
// prettier-ignore
export { default as ContactCard } from './ContactCard';
export { ContactCardGrid } from './ContactCardGrid';
// prettier-ignore
export { default as ContactDetailModal } from './ContactDetailModal';
export { ContactProfileDrawer } from './ContactProfileDrawer';
export { ContactProfileView } from './ContactProfileView';
// Aica Processing Components
export { CreditBalanceWidget } from './CreditBalanceWidget';
export { ProcessWithAicaButton } from './ProcessWithAicaButton';
export { ProcessingEstimateModal } from './ProcessingEstimateModal';
export { AnalysisResultsPanel } from './AnalysisResultsPanel';
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { DailyTimeline } from '@/modules/agenda/components/calendar/DailyTimeline';
export { ExploreMoreSection } from './ExploreMoreSection';
export { DailySummaryView } from './DailySummaryView';
// prettier-ignore
export { default as EfficiencyControlPanel } from './EfficiencyControlPanel';
export { EfficiencyMedallion } from './EfficiencyMedallion';
// prettier-ignore
export { default as EfficiencyScoreCard } from './EfficiencyScoreCard';
// prettier-ignore
export { default as EfficiencyTrendChart } from './EfficiencyTrendChart';
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
// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { WeeklyCalendarView } from '@/modules/agenda/components/calendar/WeekView';

// Invite System - Viral Growth (Gmail-style)
export { InviteBadge } from './InviteBadge';
export { InviteModal } from './InviteModal';
export { InviteShareCard } from './InviteShareCard';

// OpenClaw Adaptation — Life Council & Patterns
export { LifeCouncilCard } from './LifeCouncilCard';
export { PatternsSummary } from './PatternsSummary';

// Module Agent Chat — Reusable AI agent interface
export { ModuleAgentChat, ModuleAgentFAB, getModuleAgentConfig, MODULE_AGENT_CONFIGS } from './ModuleAgentChat';

// Module Pulse — Compact module status overview for VidaPage
export { ModulePulse } from './ModulePulse';

// Vida Chat Hero — Inline chat with expand/collapse
export { VidaChatHero } from './VidaChatHero';

// Universal Input Funnel — Multi-modal input (text + audio + photo)
export { MultiModalInput } from './MultiModalInput';
export type { MultiModalOutput } from './MultiModalInput';

// Vida Universal Input — Text + voice + action pills for VidaPage
export { VidaUniversalInput } from './VidaUniversalInput';

// Memento Mori Bar — Life progress bar + expandable year view
export { MementoMoriBar } from './MementoMoriBar';

// Scientific Scoring Engine — Issue #575
export { ScoreCard } from './ScoreCard';
export { ScoreExplainer } from './ScoreExplainer';
export { DomainWeightSliders } from './DomainWeightSliders';
export { LifeScoreWidget } from './LifeScoreWidget';

// Sprint 7 — Cross-Module Intelligence
export { CrossDomainInsights } from './CrossDomainInsights';
export { DigitalSabbaticalPrompt } from './DigitalSabbaticalPrompt';
export { GoodhartAlert } from './GoodhartAlert';
export { EthicalGuardrailsBanner } from './EthicalGuardrailsBanner';

// Weather Strip — Compact weather display for header and agenda
export { WeatherStrip } from './WeatherStrip';

// Shared Visualizations — Landing-to-App consistent charts
export * from './visualizations';
