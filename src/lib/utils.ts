/**
 * Utility Functions
 * Common utilities used across the application
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[]

/**
 * Combines class names, filtering out falsy values
 * Simple implementation without external dependencies
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x): x is string | number => Boolean(x) && typeof x !== 'boolean')
    .map(String)
    .join(' ')
    .trim()
}
