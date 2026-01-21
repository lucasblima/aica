/**
 * Health Score Components
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * UI components for health score visualization and management.
 */

// Badge components
export { HealthScoreBadge, HealthScoreCircle } from './HealthScoreBadge';

// Card components
export { HealthScoreCard } from './HealthScoreCard';

// Widget components
export { ContactsAtRiskWidget } from './ContactsAtRiskWidget';

// Chart components
export { HealthScoreTrendChart } from './HealthScoreTrendChart';

// Re-export types for convenience
export type {
  HealthScoreTrend,
  RiskLevel,
  HealthAlertType,
  HealthScoreComponents,
  HealthScoreHistory,
  ContactAtRisk,
  HealthScoreStats,
} from '@/types/healthScore';
