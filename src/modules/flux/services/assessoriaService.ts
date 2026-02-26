/**
 * Assessoria Esportiva Service
 *
 * Creates and manages the coach's "Assessoria Esportiva" (Sports Advisory)
 * as a Connections Ventures space. Each coach can have one assessoria,
 * which serves as their business entity in the platform.
 */

import { spaceService } from '@/modules/connections/services/spaceService';
import type { ConnectionSpace } from '@/modules/connections/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AssessoriaService');

/** Metadata stored in the space's settings to identify it as an assessoria */
const ASSESSORIA_MARKER = 'assessoria_esportiva';

export interface CreateAssessoriaInput {
  name: string;
  description?: string;
  accentColor?: string;
}

export const assessoriaService = {
  /**
   * Finds the user's existing Assessoria Esportiva space.
   * Returns null if none exists.
   */
  async getAssessoria(): Promise<ConnectionSpace | null> {
    try {
      const ventures = await spaceService.getSpacesByArchetype('ventures');
      const assessoria = ventures.find(
        (s) => s.settings && (s.settings as Record<string, unknown>).space_type === ASSESSORIA_MARKER
      );
      return assessoria || null;
    } catch (error) {
      log.error('Error fetching assessoria:', { error });
      throw error;
    }
  },

  /**
   * Creates a new Assessoria Esportiva as a Ventures connection space.
   * The space is pre-configured with sports advisory defaults.
   */
  async createAssessoria(input: CreateAssessoriaInput): Promise<ConnectionSpace> {
    try {
      // Check if one already exists
      const existing = await assessoriaService.getAssessoria();
      if (existing) {
        log.warn('Assessoria already exists, returning existing:', existing.id);
        return existing;
      }

      const space = await spaceService.createSpace({
        name: input.name,
        archetype: 'ventures',
        subtitle: 'Assessoria Esportiva',
        description: input.description || 'Minha assessoria esportiva',
        color_theme: input.accentColor || 'amber',
        settings: {
          space_type: ASSESSORIA_MARKER,
          business_type: 'agency' as const,
          accent_color: input.accentColor || 'amber',
        },
      });

      log.debug('Assessoria created:', space.id);
      return space;
    } catch (error) {
      log.error('Error creating assessoria:', { error });
      throw error;
    }
  },
};
