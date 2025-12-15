/**
 * useConnectionNavigation Hook
 *
 * Centralized navigation utilities for the Connections module.
 * Provides type-safe navigation helpers and breadcrumb generation.
 */

import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import type { Archetype } from '../types';
import { ARCHETYPE_METADATA } from '../types';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
}

interface UseConnectionNavigationReturn {
  /** Navigate to connections home */
  navigateToConnections: () => void;
  /** Navigate to archetype list */
  navigateToArchetype: (archetype: Archetype) => void;
  /** Navigate to space detail */
  navigateToSpace: (spaceId: string, archetype: Archetype) => void;
  /** Navigate to space section */
  navigateToSection: (spaceId: string, archetype: Archetype, section: string) => void;
  /** Get breadcrumb trail for current route */
  getBreadcrumbs: () => BreadcrumbItem[];
  /** Get current archetype from URL */
  getCurrentArchetype: () => Archetype | null;
  /** Get current space ID from URL */
  getCurrentSpaceId: () => string | null;
  /** Get current section from URL */
  getCurrentSection: () => string | null;
  /** Navigate back */
  goBack: () => void;
}

/**
 * Hook for managing Connections module navigation
 *
 * @example
 * ```tsx
 * const {
 *   navigateToSpace,
 *   navigateToSection,
 *   getBreadcrumbs,
 *   getCurrentArchetype
 * } = useConnectionNavigation();
 *
 * // Navigate to a space
 * navigateToSpace('space-123', 'habitat');
 *
 * // Navigate to a section
 * navigateToSection('space-123', 'habitat', 'inventory');
 *
 * // Get breadcrumbs
 * const breadcrumbs = getBreadcrumbs();
 * // [{ label: 'Connections', path: '/connections' }, ...]
 *
 * // Get current archetype
 * const archetype = getCurrentArchetype(); // 'habitat'
 * ```
 */
export function useConnectionNavigation(): UseConnectionNavigationReturn {
  const navigate = useNavigate();
  const params = useParams<{ archetype?: string; spaceId?: string; section?: string }>();
  const location = useLocation();

  // Get current archetype from URL
  const getCurrentArchetype = (): Archetype | null => {
    if (!params.archetype) return null;
    return params.archetype as Archetype;
  };

  // Get current space ID from URL
  const getCurrentSpaceId = (): string | null => {
    return params.spaceId || null;
  };

  // Get current section from URL
  const getCurrentSection = (): string | null => {
    return params.section || null;
  };

  // Navigation helpers
  const navigateToConnections = () => {
    navigate('/connections');
  };

  const navigateToArchetype = (archetype: Archetype) => {
    navigate(`/connections/${archetype}`);
  };

  const navigateToSpace = (spaceId: string, archetype: Archetype) => {
    navigate(`/connections/${archetype}/${spaceId}`);
  };

  const navigateToSection = (spaceId: string, archetype: Archetype, section: string) => {
    navigate(`/connections/${archetype}/${spaceId}/${section}`);
  };

  const goBack = () => {
    const parentPath = computeParentPath();
    navigate(parentPath);
  };

  /**
   * Compute the parent path based on current location
   * This ensures reliable navigation regardless of how user arrived at page
   */
  const computeParentPath = (): string => {
    const archetype = getCurrentArchetype();
    const spaceId = getCurrentSpaceId();
    const section = getCurrentSection();

    // From section view → go to space detail
    if (section && spaceId && archetype) {
      return `/connections/${archetype}/${spaceId}`;
    }

    // From space detail → go to archetype list
    if (spaceId && archetype) {
      return `/connections/${archetype}`;
    }

    // From archetype list → go to connections home
    if (archetype) {
      return '/connections';
    }

    // Default fallback to connections home
    return '/connections';
  };

  // Generate breadcrumbs based on current route
  const getBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Connections home
    breadcrumbs.push({
      label: 'Conexões',
      path: '/connections',
      icon: '🔗',
    });

    const archetype = getCurrentArchetype();
    const spaceId = getCurrentSpaceId();
    const section = getCurrentSection();

    // Add archetype breadcrumb if present
    if (archetype && ARCHETYPE_METADATA[archetype]) {
      const archetypeData = ARCHETYPE_METADATA[archetype];
      breadcrumbs.push({
        label: archetypeData.name,
        path: `/connections/${archetype}`,
        icon: archetypeData.icon,
      });
    }

    // Add space breadcrumb if present
    if (archetype && spaceId) {
      // Note: We could fetch the space name here, but to keep it simple
      // we'll just use a placeholder. Components can override this.
      breadcrumbs.push({
        label: 'Espaço',
        path: `/connections/${archetype}/${spaceId}`,
      });
    }

    // Add section breadcrumb if present
    if (archetype && spaceId && section) {
      // Format section name (e.g., 'inventory' -> 'Inventário')
      const sectionLabel = formatSectionName(section);
      breadcrumbs.push({
        label: sectionLabel,
        path: `/connections/${archetype}/${spaceId}/${section}`,
      });
    }

    return breadcrumbs;
  }, [location.pathname, params]);

  return {
    navigateToConnections,
    navigateToArchetype,
    navigateToSpace,
    navigateToSection,
    getBreadcrumbs,
    getCurrentArchetype,
    getCurrentSpaceId,
    getCurrentSection,
    goBack,
  };
}

/**
 * Format section name for display
 */
function formatSectionName(section: string): string {
  const sectionMap: Record<string, string> = {
    // Habitat
    inventory: 'Inventário',
    maintenance: 'Manutenção',
    property: 'Propriedade',

    // Ventures
    metrics: 'Métricas',
    team: 'Equipe',
    milestones: 'Marcos',

    // Academia
    journeys: 'Jornadas',
    notes: 'Notas',
    mentorships: 'Mentorias',
    portfolio: 'Portfólio',

    // Tribo
    rituals: 'Rituais',
    discussions: 'Discussões',
    resources: 'Recursos',
    funds: 'Fundos',
  };

  return sectionMap[section] || section.charAt(0).toUpperCase() + section.slice(1);
}

export default useConnectionNavigation;
