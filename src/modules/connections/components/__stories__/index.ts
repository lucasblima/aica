/**
 * Storybook Stories Index
 *
 * This file exports all Storybook stories for the Connection components.
 * Import from this file to access all stories programmatically.
 *
 * @example
 * ```typescript
 * import * as ConnectionStories from './components/__stories__';
 * ```
 */

// Export all stories
export * from './ConnectionSpaceCard.stories';
export * from './MemberAvatarStack.stories';
export * from './InviteMemberForm.stories';
export * from './SpaceDetailsHeader.stories';

/**
 * Story metadata for documentation and testing
 */
export const STORY_METADATA = {
  ConnectionSpaceCard: {
    title: 'Connections/ConnectionSpaceCard',
    component: 'ConnectionSpaceCard',
    storyCount: 15,
    variants: ['default', 'compact'],
    archetypes: ['habitat', 'ventures', 'academia', 'tribo'],
    description: 'Main connection space card with archetype-specific styling',
  },
  MemberAvatarStack: {
    title: 'Connections/MemberAvatarStack',
    component: 'MemberAvatarStack',
    storyCount: 17,
    sizes: ['sm', 'md', 'lg'],
    description: 'Overlapping avatar stack with overflow indicators',
  },
  InviteMemberForm: {
    title: 'Connections/InviteMemberForm',
    component: 'InviteMemberForm',
    storyCount: 12,
    states: ['default', 'loading', 'error', 'success'],
    description: 'Member invitation form with validation and states',
  },
  SpaceDetailsHeader: {
    title: 'Connections/SpaceDetailsHeader',
    component: 'SpaceDetailsHeader',
    storyCount: 18,
    archetypes: ['habitat', 'ventures', 'academia', 'tribo'],
    description: 'Space detail page header with archetype-specific accents',
  },
} as const;

/**
 * Total story count across all components
 */
export const TOTAL_STORIES = 62;

/**
 * Quick reference guide for story structure
 */
export const STORY_CATEGORIES = {
  variants: [
    'Default/primary state',
    'Size variants',
    'State variants',
    'Archetype variants',
  ],
  edgeCases: [
    'Empty states',
    'Overflow/many items',
    'Long content',
    'Single item',
  ],
  comparisons: [
    'All variants side-by-side',
    'Before/after states',
    'Different contexts',
  ],
  interactive: [
    'Working button handlers',
    'Form workflows',
    'Real-world scenarios',
  ],
} as const;

export default {
  STORY_METADATA,
  TOTAL_STORIES,
  STORY_CATEGORIES,
};
