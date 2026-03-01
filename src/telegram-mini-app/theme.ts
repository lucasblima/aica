// src/telegram-mini-app/theme.ts
import WebApp from '@twa-dev/sdk'

/**
 * Ceramic fallback colors for when Telegram theme params are unavailable.
 * Source: tailwind.config.js -> colors.ceramic
 */
const CERAMIC_FALLBACKS = {
  bg_color: '#F0EFE9',
  text_color: '#5C554B',
  hint_color: '#948D82',
  button_color: '#D97706',
  button_text_color: '#FFFFFF',
  secondary_bg_color: '#E8EBE9',
  header_bg_color: '#F0EFE9',
  accent_text_color: '#D97706',
  section_bg_color: '#F0EFE9',
  section_header_text_color: '#948D82',
  subtitle_text_color: '#948D82',
  destructive_text_color: '#9B4D3A',
} as const

type ThemeKey = keyof typeof CERAMIC_FALLBACKS

/**
 * Apply Telegram theme as CSS custom properties on :root.
 * Call once at app startup.
 */
export function applyTelegramTheme(): void {
  const root = document.documentElement
  const tp = WebApp.themeParams || {}

  for (const [key, fallback] of Object.entries(CERAMIC_FALLBACKS)) {
    const value = (tp as Record<string, string | undefined>)[key] || fallback
    root.style.setProperty(`--tg-${key.replace(/_/g, '-')}`, value)
  }

  // Set color scheme for Tailwind dark mode detection
  const colorScheme = WebApp.colorScheme || 'light'
  root.setAttribute('data-theme', colorScheme)
}

/**
 * CSS variable names for use in Tailwind arbitrary values or inline styles.
 * Example: `className="bg-[var(--tg-bg-color)]"`
 */
export const tgVar = (key: ThemeKey) =>
  `var(--tg-${key.replace(/_/g, '-')})`
