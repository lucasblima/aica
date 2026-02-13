/**
 * Emotion Helper
 * Normalizes emotion values from any stored format to a consistent display object.
 *
 * Handles:
 * - AVAILABLE_EMOTIONS value strings (e.g., 'happy', 'neutral')
 * - Legacy "emoji label" format (e.g., "😐 Neutro", "😊 Feliz")
 * - Raw emoji-only (e.g., "😊")
 * - Portuguese labels (e.g., "Feliz", "Neutro")
 */

import { AVAILABLE_EMOTIONS } from './moment'

export interface EmotionDisplay {
  emoji: string
  label: string
  value: string
}

const DEFAULT_EMOTION: EmotionDisplay = { emoji: '📝', label: 'Momento', value: '' }

// Build lookup maps once
const byValue = new Map(AVAILABLE_EMOTIONS.map(e => [e.value, e]))
const byName = new Map(AVAILABLE_EMOTIONS.map(e => [e.name.toLowerCase(), e]))
const byEmoji = new Map(AVAILABLE_EMOTIONS.map(e => [e.emoji, e]))

/**
 * Resolve any stored emotion format to { emoji, label, value }.
 *
 * @param emotion - The raw emotion string from the database
 * @returns Normalized emotion display object
 */
export function getEmotionDisplay(emotion: string | undefined | null): EmotionDisplay {
  if (!emotion || !emotion.trim()) return DEFAULT_EMOTION

  const trimmed = emotion.trim()

  // 1. Direct value match (e.g., 'happy', 'neutral')
  const valueMatch = byValue.get(trimmed)
  if (valueMatch) return { emoji: valueMatch.emoji, label: valueMatch.name, value: valueMatch.value }

  // 2. Legacy "emoji label" format (e.g., "😐 Neutro")
  const emojiPrefixMatch = trimmed.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.*)$/u)
  if (emojiPrefixMatch) {
    const [, rawEmoji, rawLabel] = emojiPrefixMatch
    // Try matching the emoji
    const emojiMatch = byEmoji.get(rawEmoji)
    if (emojiMatch) return { emoji: emojiMatch.emoji, label: emojiMatch.name, value: emojiMatch.value }
    // Try matching the label text
    if (rawLabel) {
      const labelMatch = byName.get(rawLabel.toLowerCase())
      if (labelMatch) return { emoji: labelMatch.emoji, label: labelMatch.name, value: labelMatch.value }
    }
    // Unknown emoji+label combo — use as-is
    return { emoji: rawEmoji, label: rawLabel || 'Momento', value: '' }
  }

  // 3. Portuguese label match (e.g., "Feliz", "Neutro")
  const nameMatch = byName.get(trimmed.toLowerCase())
  if (nameMatch) return { emoji: nameMatch.emoji, label: nameMatch.name, value: nameMatch.value }

  // 4. Emoji-only match
  const emojiOnly = byEmoji.get(trimmed)
  if (emojiOnly) return { emoji: emojiOnly.emoji, label: emojiOnly.name, value: emojiOnly.value }

  // 5. Fallback
  return DEFAULT_EMOTION
}

/**
 * Map AI mood result { emoji, label } to the closest AVAILABLE_EMOTIONS value.
 * Used when saving AI-detected emotion to the database.
 */
export function mapAIMoodToValue(mood: { emoji: string; label: string }): string {
  // Try matching by emoji first
  const emojiMatch = byEmoji.get(mood.emoji)
  if (emojiMatch) return emojiMatch.value

  // Try matching by label
  const labelMatch = byName.get(mood.label.toLowerCase())
  if (labelMatch) return labelMatch.value

  // Fuzzy: try partial label match
  for (const [name, entry] of byName) {
    if (mood.label.toLowerCase().includes(name) || name.includes(mood.label.toLowerCase())) {
      return entry.value
    }
  }

  // Fallback: return 'neutral' only as absolute last resort
  return 'neutral'
}
