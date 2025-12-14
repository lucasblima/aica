/**
 * Connections Module
 *
 * Implements the four Connection Archetypes:
 * - 🏠 Habitat - Physical anchor (home, condo management)
 * - 💼 Ventures - Creation engine (projects, businesses)
 * - 🎓 Academia - Mind cultivation (learning, mentoring)
 * - 👥 Tribo - Social fabric (clubs, communities)
 *
 * @module connections
 */

import React from 'react';

// ==================== TYPES ====================
export * from './types';

// ==================== SERVICES ====================
export * from './services';

// ==================== HOOKS ====================
export * from './hooks';

// ==================== LAZY LOADED MODULES ====================
// Code splitting - cada arquétipo é carregado sob demanda

export const HabitatModule = React.lazy(() => import('./habitat'));
export const VenturesModule = React.lazy(() => import('./ventures'));
export const AcademiaModule = React.lazy(() => import('./academia'));
export const TriboModule = React.lazy(() => import('./tribo'));

// ==================== DYNAMIC IMPORTS ====================
/**
 * Helper para carregar módulos de arquétipo dinamicamente
 * Usado para code splitting e otimização de bundle
 */
export async function loadArchetypeModule(archetype: string) {
  switch (archetype) {
    case 'habitat':
      return import('./habitat');
    case 'ventures':
      return import('./ventures');
    case 'academia':
      return import('./academia');
    case 'tribo':
      return import('./tribo');
    default:
      throw new Error(`Unknown archetype: ${archetype}`);
  }
}

// ==================== COMPONENTS ====================
// Exportar componentes compartilhados diretamente (não lazy)
export * from './components';

// ==================== VIEWS ====================
// Exportar views principais diretamente (não lazy)
export * from './views';
