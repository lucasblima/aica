/**
 * Task AI Service — Shared re-export of Atlas AI task intelligence functions.
 *
 * Cross-module consumers (Agenda, shared domain components) should import from
 * here instead of directly from @/modules/atlas/services/atlasAIService,
 * respecting bounded context boundaries (see domain-driven-design.md).
 *
 * Atlas-internal consumers continue to import from atlasAIService directly.
 */

export {
  suggestPriority,
  QUADRANT_MAP,
  decomposeTask,
  type PrioritySuggestion,
  type TaskDecomposition,
} from '@/modules/atlas/services/atlasAIService';
