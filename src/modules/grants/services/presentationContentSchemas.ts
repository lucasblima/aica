/**
 * Presentation Content Validation Schemas
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Zod schemas for validating generated slide content.
 * Ensures that AI-generated content conforms to expected structure.
 *
 * @module modules/grants/services/presentationContentSchemas
 */

import { z } from 'zod';
import type { SlideType } from '../types/presentation';

// =============================================================================
// COVER SLIDE SCHEMA
// =============================================================================

export const coverSlideSchema = z.object({
  title: z.string().max(100, 'Title must be 100 characters or less'),
  subtitle: z.string().max(200, 'Subtitle must be 200 characters or less').optional(),
  tagline: z.string().max(150, 'Tagline must be 150 characters or less').optional(),
  backgroundImage: z.string().url('Background image must be a valid URL').optional(),
});

// =============================================================================
// ORGANIZATION SLIDE SCHEMA
// =============================================================================

export const organizationSlideSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  mission: z.string().optional(),
  vision: z.string().optional(),
  achievements: z.array(z.string()).max(5, 'Maximum 5 achievements'),
  logoUrl: z.string().url('Logo must be a valid URL').optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
});

// =============================================================================
// PROJECT SLIDE SCHEMA
// =============================================================================

export const projectSlideSchema = z.object({
  title: z.string().max(100, 'Title must be 100 characters or less'),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  objectives: z.array(z.string()).min(1, 'At least one objective required').max(5),
  budget: z
    .object({
      total: z.number().positive('Total budget must be positive'),
      breakdown: z
        .array(
          z.object({
            category: z.string(),
            amount: z.number().positive(),
          })
        )
        .optional(),
    })
    .optional(),
  timeline: z
    .array(
      z.object({
        phase: z.string(),
        duration: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  expectedImpact: z.string().min(50).optional(),
});

// =============================================================================
// IMPACT METRICS SLIDE SCHEMA
// =============================================================================

export const impactMetricsSlideSchema = z.object({
  title: z.string().max(80),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
        unit: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .min(1, 'At least one metric required')
    .max(6, 'Maximum 6 metrics'),
  impactStatement: z.string().max(200).optional(),
});

// =============================================================================
// TIMELINE SLIDE SCHEMA
// =============================================================================

export const timelineSlideSchema = z.object({
  title: z.string().max(80),
  events: z
    .array(
      z.object({
        date: z.string(),
        title: z.string(),
        description: z.string().optional(),
        isHighlighted: z.boolean().optional(),
      })
    )
    .min(1, 'At least one event required')
    .max(8, 'Maximum 8 events'),
});

// =============================================================================
// TEAM SLIDE SCHEMA
// =============================================================================

export const teamSlideSchema = z.object({
  title: z.string().max(80),
  members: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        bio: z.string().max(200).optional(),
        photoUrl: z.string().url().optional(),
        linkedIn: z.string().url().optional(),
      })
    )
    .min(1, 'At least one team member required')
    .max(6, 'Maximum 6 team members'),
});

// =============================================================================
// INCENTIVE LAW SLIDE SCHEMA
// =============================================================================

export const incentiveLawSlideSchema = z.object({
  title: z.string().max(80),
  lawName: z.string(),
  deductionPercentage: z.number().min(0).max(100),
  benefits: z.array(z.string()).min(1).max(5),
  howItWorks: z.string().min(50).max(500),
  disclaimer: z.string().max(200).optional(),
});

// =============================================================================
// TIERS SLIDE SCHEMA
// =============================================================================

export const tiersSlideSchema = z.object({
  title: z.string().max(80),
  tiers: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number().nonnegative(),
        benefits: z.array(z.string()).min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .min(1, 'At least one tier required')
    .max(5, 'Maximum 5 tiers'),
});

// =============================================================================
// TESTIMONIALS SLIDE SCHEMA
// =============================================================================

export const testimonialsSlideSchema = z.object({
  title: z.string().max(80),
  testimonials: z
    .array(
      z.object({
        quote: z.string().min(20).max(500),
        author: z.string(),
        role: z.string().optional(),
        photoUrl: z.string().url().optional(),
        organization: z.string().optional(),
      })
    )
    .max(3, 'Maximum 3 testimonials'),
});

// =============================================================================
// MEDIA SLIDE SCHEMA
// =============================================================================

export const mediaSlideSchema = z.object({
  title: z.string().max(80),
  mediaItems: z
    .array(
      z.object({
        outlet: z.string(),
        title: z.string(),
        date: z.string(),
        url: z.string().url().optional(),
        thumbnail: z.string().url().optional(),
      })
    )
    .max(6, 'Maximum 6 media items'),
});

// =============================================================================
// COMPARISON SLIDE SCHEMA
// =============================================================================

export const comparisonSlideSchema = z.object({
  title: z.string().max(80),
  subtitle: z.string().max(150).optional(),
  comparisonItems: z
    .array(
      z.object({
        label: z.string(),
        before: z.union([z.string(), z.number()]),
        after: z.union([z.string(), z.number()]),
        improvement: z.string().optional(),
      })
    )
    .min(1, 'At least one comparison item required')
    .max(5, 'Maximum 5 comparison items'),
});

// =============================================================================
// CONTACT SLIDE SCHEMA
// =============================================================================

export const contactSlideSchema = z.object({
  title: z.string().max(80),
  organizationName: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format'),
  website: z.string().url('Invalid website URL').optional(),
  socialMedia: z
    .object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
    })
    .optional(),
  callToAction: z.string().max(150).optional(),
});

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

/**
 * Map of slide types to their Zod schemas
 */
export const SLIDE_SCHEMAS: Record<SlideType, z.ZodSchema> = {
  cover: coverSlideSchema,
  organization: organizationSlideSchema,
  project: projectSlideSchema,
  'impact-metrics': impactMetricsSlideSchema,
  timeline: timelineSlideSchema,
  team: teamSlideSchema,
  'incentive-law': incentiveLawSlideSchema,
  tiers: tiersSlideSchema,
  testimonials: testimonialsSlideSchema,
  media: mediaSlideSchema,
  comparison: comparisonSlideSchema,
  contact: contactSlideSchema,
};

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validate slide content against its schema
 *
 * @param slideType - Type of slide
 * @param content - Content to validate
 * @returns Validation result with parsed data or errors
 */
export function validateSlideContent(
  slideType: SlideType,
  content: unknown
): { success: true; data: Record<string, unknown> } | { success: false; errors: string[] } {
  const schema = SLIDE_SCHEMAS[slideType];

  if (!schema) {
    return {
      success: false,
      errors: [`No schema defined for slide type: ${slideType}`],
    };
  }

  const result = schema.safeParse(content);

  if (result.success) {
    return {
      success: true,
      data: result.data as Record<string, unknown>,
    };
  }

  // Extract error messages from Zod
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return `${path ? `${path}: ` : ''}${err.message}`;
  });

  return {
    success: false,
    errors,
  };
}

// =============================================================================
// SANITIZATION HELPERS
// =============================================================================

/**
 * Attempt to sanitize invalid content by applying default values
 *
 * @param slideType - Type of slide
 * @param content - Invalid content
 * @returns Sanitized content or null if cannot be fixed
 */
export function sanitizeSlideContent(
  slideType: SlideType,
  content: Record<string, unknown>
): Record<string, unknown> | null {
  // Basic sanitization strategies
  const sanitized = { ...content };

  // Remove null/undefined fields
  for (const [key, value] of Object.entries(sanitized)) {
    if (value === null || value === undefined) {
      delete sanitized[key];
    }
  }

  // Type-specific sanitization
  switch (slideType) {
    case 'cover':
      if (!sanitized.title || typeof sanitized.title !== 'string') {
        sanitized.title = 'Apresentação';
      }
      break;

    case 'organization':
      if (!sanitized.name || typeof sanitized.name !== 'string') {
        sanitized.name = 'Organização';
      }
      if (!sanitized.description) {
        sanitized.description = 'Organização comprometida com a transformação social.';
      }
      if (!Array.isArray(sanitized.achievements)) {
        sanitized.achievements = [];
      }
      break;

    case 'impact-metrics':
      if (!Array.isArray(sanitized.metrics)) {
        sanitized.metrics = [];
      }
      break;

    // Add more type-specific sanitization as needed
  }

  // Try validating again
  const validation = validateSlideContent(slideType, sanitized);

  return validation.success ? sanitized : null;
}
