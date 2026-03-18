/**
 * Context window management for ReACT loop and long-context chat.
 * Prevents context explosion by capping reference sizes.
 */

/**
 * Truncate text to maxChars, keeping start and end with an indicator in the middle.
 * Default maxChars: 4000 (optimized for Gemini context windows).
 */
export function truncateReference(text: string, maxChars: number = 4000): string {
  if (text.length <= maxChars) return text
  const indicator = '\n\n[... truncated ...]\n\n'
  const keepChars = Math.floor((maxChars - indicator.length) / 2)
  return text.slice(0, keepChars) + indicator + text.slice(-keepChars)
}

/**
 * Distribute a total character budget evenly across observations.
 * Each observation is truncated to its share of the budget.
 * Default totalBudget: 16000 chars.
 */
export function buildContextBudget(
  observations: string[],
  totalBudget: number = 16000
): string[] {
  if (observations.length === 0) return []
  const perObs = Math.floor(totalBudget / observations.length)
  return observations.map(obs => truncateReference(obs, perObs))
}
