/**
 * Welcome Tour Styles
 * Import this file in your main app or layout to activate custom styles
 *
 * Usage:
 * import '@/modules/onboarding/components/WelcomeTour.styles';
 *
 * Or in your main.tsx:
 * import '@/modules/onboarding/styles/welcome-tour.css';
 */

// This file serves as a reference for importing the CSS
// The actual CSS is in ../styles/welcome-tour.css

/**
 * To use the styles:
 *
 * Option 1: Import in your main layout/app:
 * ```typescript
 * import '@/modules/onboarding/styles/welcome-tour.css';
 * ```
 *
 * Option 2: Import in main.tsx:
 * ```typescript
 * import '@/modules/onboarding/styles/welcome-tour.css';
 * ```
 *
 * Option 3: Add to your Tailwind CSS configuration
 * The component uses Tailwind classes primarily,
 * with the CSS file providing animations and special effects.
 */

export const STYLE_IMPORTS = {
  welcomeTourCSS: '@/modules/onboarding/styles/welcome-tour.css',
};

/**
 * Key CSS Classes Provided:
 *
 * - .animate-blob: Animated blob background
 * - .animation-delay-2000: 2s animation delay
 * - .animation-delay-4000: 4s animation delay
 * - .focus-visible\:ring-blue-500: Focus visible ring
 * - .tour-card: Card styling
 * - .gradient-text: Gradient text effect
 * - .btn-active: Active button state
 * - .modal-backdrop: Modal backdrop blur
 * - .body.modal-open: Prevent scroll
 * - .progress-dot: Progress dot styling
 * - .progress-dot.active: Active progress dot
 * - .tour-headline: Responsive headline
 * - .tour-description: Responsive description
 *
 * Animations provided:
 * - @keyframes blob: Blob animation (7s)
 * - @media (prefers-reduced-motion): Respects user preference
 */
