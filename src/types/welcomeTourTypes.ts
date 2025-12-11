/**
 * Welcome Tour Type Definitions
 * TypeScript interfaces and types for the tour system
 */

import type { Pillar } from '../data/pillarData';

/**
 * Tour state management
 */
export interface TourState {
  currentSlideIndex: number;
  isAutoPlaying: boolean;
  selectedPillar: Pillar | null;
  showDetailsModal: boolean;
  completionTimestamp: Date | null;
  skippedAt: Date | null;
}

/**
 * Tour interaction callbacks
 */
export interface TourCallbacks {
  onComplete?: () => void;
  onSkip?: () => void;
  onPillarExplore?: (pillar: Pillar) => void;
  onSlideChange?: (index: number, pillar: Pillar) => void;
  onModalOpen?: (pillar: Pillar) => void;
  onModalClose?: () => void;
}

/**
 * Tour configuration options
 */
export interface TourConfig {
  autoPlayEnabled?: boolean;
  autoPlayInterval?: number;
  allowSkip?: boolean;
  showProgressDots?: boolean;
  showNavigationArrows?: boolean;
  enableKeyboardNavigation?: boolean;
  enableTouchNavigation?: boolean;
  modalClosableOnBackdropClick?: boolean;
  animationDuration?: number;
  highlightedPillars?: Pillar['id'][];
}

/**
 * Tour event tracking
 */
export interface TourEvent {
  eventType: 'slide_changed' | 'modal_opened' | 'pillar_explored' | 'tour_completed' | 'tour_skipped';
  timestamp: Date;
  slideIndex?: number;
  pillarId?: Pillar['id'];
  metadata?: Record<string, any>;
}

/**
 * Tour analytics data
 */
export interface TourAnalytics {
  totalDuration: number; // milliseconds
  slideViews: SlideView[];
  pillarsExplored: Pillar['id'][];
  completionStatus: 'completed' | 'skipped' | 'abandoned';
  completionTimestamp?: Date;
}

/**
 * Individual slide view analytics
 */
export interface SlideView {
  pillarId: Pillar['id'];
  viewedAt: Date;
  duration: number; // milliseconds
  userInteractions: number;
  learnMoreClicked: boolean;
  exploreClicked: boolean;
}

/**
 * Onboarding step status
 */
export interface OnboardingStepStatus {
  stepId: string;
  stepName: string;
  completed: boolean;
  completedAt?: Date;
  skipped: boolean;
  skippedAt?: Date;
  duration?: number;
}

/**
 * User onboarding progress
 */
export interface UserOnboardingProgress {
  userId: string;
  welcomeTourCompleted: boolean;
  welcomeTourStartedAt: Date;
  welcomeTourCompletedAt?: Date;
  welcomeTourSkipped: boolean;
  welcomeTourSkippedAt?: Date;
  pillarsViewed: Pillar['id'][];
  currentStep: string;
  overallProgress: number; // 0-100
}

/**
 * Theme configuration for future customization
 */
export interface TourTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

/**
 * Accessibility options
 */
export interface A11yOptions {
  respectReducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  keyboardOnly: boolean;
}
