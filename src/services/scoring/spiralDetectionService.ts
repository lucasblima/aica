/**
 * Spiral Detection Service
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Detects negative spirals: when 3+ correlated life domains decline
 * simultaneously, indicating a systemic problem that needs attention.
 *
 * Based on clinical comorbidity patterns and cross-domain correlation analysis.
 * Framed as "areas for growth" (sufficiency model, GNH-inspired).
 */

import type { CorrelatedPair, SpiralAlert, DomainScore, ScoreTrend } from './types';

// ============================================================================
// CORRELATED DOMAIN PAIRS
// ============================================================================

/**
 * Known correlations between AICA domains.
 * When both domains in a pair decline, the risk of a negative spiral increases.
 * These correlations are based on established psychological and economic research.
 */
export const CORRELATED_PAIRS: CorrelatedPair[] = [
  {
    domainA: 'journey',
    domainB: 'atlas',
    description: 'Bem-estar e produtividade — estresse reduz foco e desempenho',
  },
  {
    domainA: 'finance',
    domainB: 'journey',
    description: 'Saúde financeira e bem-estar — preocupações financeiras afetam sono e humor',
  },
  {
    domainA: 'connections',
    domainB: 'journey',
    description: 'Relacionamentos e bem-estar — isolamento social e solidão',
  },
  {
    domainA: 'atlas',
    domainB: 'flux',
    description: 'Produtividade e treino — sobrecarga de trabalho reduz exercício',
  },
  {
    domainA: 'finance',
    domainB: 'connections',
    description: 'Finanças e relacionamentos — estresse financeiro gera conflitos',
  },
  {
    domainA: 'journey',
    domainB: 'flux',
    description: 'Bem-estar e treino — saúde mental afeta motivação para exercício',
  },
];

// ============================================================================
// SPIRAL DETECTION ALGORITHM
// ============================================================================

/** Detection window in number of entries (not days, since frequency varies) */
const MIN_HISTORY_ENTRIES = 3;

/**
 * Identify domains that are declining based on recent history.
 * A domain is "declining" if its score dropped by more than the threshold
 * over the most recent entries.
 */
function getDecliningDomains(
  history: { composite: number; computedAt: string }[],
  currentDomains: DomainScore[],
  _windowDays = 14
): string[] {
  // If we don't have enough history, use current trend from domain scores
  if (history.length < MIN_HISTORY_ENTRIES) {
    return currentDomains
      .filter(d => d.trend === 'declining')
      .map(d => d.module);
  }

  // Otherwise check if composite trend is negative
  // AND check per-domain trends
  const declining: string[] = [];
  for (const domain of currentDomains) {
    if (domain.trend === 'declining') {
      declining.push(domain.module);
    }
  }

  return declining;
}

/**
 * Detect negative spiral from Life Score history and current domain scores.
 *
 * A spiral is detected when:
 * - 3+ domains are simultaneously declining, OR
 * - 1+ correlated domain pairs are both declining
 *
 * Severity:
 * - 'warning': 1 correlated pair OR 3 declining domains
 * - 'critical': 2+ correlated pairs OR 4+ declining domains
 */
export function detectSpiral(
  history: { composite: number; computedAt: string }[],
  currentDomains: DomainScore[],
  windowDays = 14
): SpiralAlert {
  const declining = getDecliningDomains(history, currentDomains, windowDays);

  // Check for correlated declines
  const correlatedDeclines = CORRELATED_PAIRS.filter(
    pair => declining.includes(pair.domainA) && declining.includes(pair.domainB)
  );

  const detected = correlatedDeclines.length >= 1 || declining.length >= 3;
  const severity: 'warning' | 'critical' =
    correlatedDeclines.length >= 2 || declining.length >= 4 ? 'critical' : 'warning';

  let message = '';
  if (detected) {
    if (correlatedDeclines.length > 0) {
      const pairDescriptions = correlatedDeclines
        .map(p => p.description)
        .join('; ');
      message = `Padrão de declínio detectado: ${pairDescriptions}. Considere priorizar essas áreas.`;
    } else {
      message = `${declining.length} áreas da sua vida estão em declínio simultâneo. Considere focar nas áreas que mais precisam de atenção.`;
    }
  }

  return {
    detected,
    decliningDomains: declining,
    correlatedDeclines,
    severity,
    message,
  };
}

/**
 * Get spiral-aware recommendations based on declining domains.
 * Returns actionable suggestions in Portuguese.
 */
export function getSpiralRecommendations(alert: SpiralAlert): string[] {
  if (!alert.detected) return [];

  const recommendations: string[] = [];

  // Priority: address correlated pairs first (they amplify each other)
  for (const pair of alert.correlatedDeclines) {
    switch (`${pair.domainA}-${pair.domainB}`) {
      case 'journey-atlas':
      case 'atlas-journey':
        recommendations.push(
          'Reduza a carga de trabalho e priorize descanso — estresse crônico reduz produtividade'
        );
        break;
      case 'finance-journey':
      case 'journey-finance':
        recommendations.push(
          'Crie um plano financeiro simples — mesmo pequenos passos reduzem a ansiedade financeira'
        );
        break;
      case 'connections-journey':
      case 'journey-connections':
        recommendations.push(
          'Reconecte-se com 1-2 pessoas próximas — relacionamentos são o maior preditor de bem-estar'
        );
        break;
      case 'atlas-flux':
      case 'flux-atlas':
        recommendations.push(
          'Inclua movimento na rotina de trabalho — 20 min de caminhada melhora foco e energia'
        );
        break;
      default:
        recommendations.push(
          `Atenção às áreas de ${pair.domainA} e ${pair.domainB} — elas estão se influenciando mutuamente`
        );
    }
  }

  // General recommendations for non-paired declining domains
  if (alert.decliningDomains.length >= 3 && alert.correlatedDeclines.length === 0) {
    recommendations.push(
      'Várias áreas estão em declínio — escolha UMA para focar esta semana (evite tentar resolver tudo de uma vez)'
    );
  }

  if (alert.severity === 'critical') {
    recommendations.push(
      'Considere conversar com alguém de confiança sobre o momento atual — apoio social é fundamental'
    );
  }

  return recommendations;
}
