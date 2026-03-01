/**
 * Flux Components — Barrel Export
 *
 * Top-level re-exports for Flux module components.
 */

// Sub-barrels
export * from './athlete';
export * from './canvas';

// Training Science (Sprint 6 — Fatigue Modeling)
export { TrainingLoadChart } from './TrainingLoadChart';
export type { TrainingLoadChartProps } from './TrainingLoadChart';

export { ReadinessGauge } from './ReadinessGauge';
export type { ReadinessGaugeProps } from './ReadinessGauge';

export { FatigueRiskBadge } from './FatigueRiskBadge';
export type { FatigueRiskBadgeProps } from './FatigueRiskBadge';
