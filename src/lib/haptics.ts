/**
 * Haptic Feedback Utilities
 *
 * Provides tactile feedback for important interactions on supported devices.
 * Uses the Web Vibration API (navigator.vibrate).
 *
 * Note: Vibration API is only available on mobile devices and some browsers.
 * Calls will silently fail on unsupported devices.
 */

type VibrationPattern = number | number[];

/**
 * Check if haptic feedback is available on this device
 */
export const isHapticAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Trigger a vibration pattern
 * @param pattern - Duration in ms or array of [vibrate, pause, vibrate, ...]
 */
export const vibrate = (pattern: VibrationPattern): boolean => {
  if (!isHapticAvailable()) return false;

  try {
    return navigator.vibrate(pattern);
  } catch (e) {
    console.warn('Haptic feedback failed:', e);
    return false;
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancelVibration = (): void => {
  if (isHapticAvailable()) {
    navigator.vibrate(0);
  }
};

/**
 * Preset haptic patterns for common interactions
 */
export const hapticFeedback = {
  /**
   * Light tap - for selections, toggles
   * Duration: 10ms
   */
  light: () => vibrate(10),

  /**
   * Medium tap - for confirmations, card selections
   * Duration: 20ms
   */
  medium: () => vibrate(20),

  /**
   * Heavy tap - for important actions, deletions
   * Pattern: [20ms vibrate, 10ms pause, 20ms vibrate]
   */
  heavy: () => vibrate([20, 10, 20]),

  /**
   * Success - for completed actions
   * Pattern: [10ms, pause, 30ms]
   */
  success: () => vibrate([10, 50, 30]),

  /**
   * Error - for failed actions
   * Pattern: rapid triple pulse
   */
  error: () => vibrate([30, 30, 30, 30, 30]),

  /**
   * Selection change - for tab switches, picker changes
   * Duration: 5ms (very subtle)
   */
  selection: () => vibrate(5),

  /**
   * Long press acknowledgment
   * Duration: 50ms
   */
  longPress: () => vibrate(50),
} as const;

/**
 * React hook for haptic feedback
 * Returns the hapticFeedback object only if haptics are available
 *
 * @example
 * ```tsx
 * const haptics = useHaptics();
 *
 * const handlePress = () => {
 *   haptics?.medium();
 *   // ... rest of handler
 * };
 * ```
 */
export function useHaptics() {
  if (!isHapticAvailable()) return null;
  return hapticFeedback;
}

export default hapticFeedback;
