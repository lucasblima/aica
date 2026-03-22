/**
 * Unit Tests for Telegram Email Extraction
 *
 * Tests the extractEmailFromText function used in telegram-webhook
 * to parse emails from text and spoken Portuguese patterns.
 *
 * Note: These functions are duplicated from the Edge Function (Deno)
 * since they can't be directly imported in Vitest. The logic must
 * stay in sync with supabase/functions/telegram-webhook/index.ts.
 *
 * @see supabase/functions/telegram-webhook/index.ts
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// DUPLICATED LOGIC (must stay in sync with telegram-webhook/index.ts)
// ============================================================================

const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  if (email.endsWith('@telegram.aica.guru')) return false
  return EMAIL_REGEX.test(email)
}

function extractEmailFromText(text: string): string | null {
  if (!text) return null
  const normalized = text.trim().toLowerCase()

  const directMatch = normalized.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/)
  if (directMatch) {
    const candidate = directMatch[0].replace(/[),.;:!?]+$/, '')
    if (isValidEmail(candidate)) return candidate
  }

  const tokenMap: Record<string, string> = {
    'arroba': '@',
    'ponto': '.',
    'dot': '.',
    'traco': '-',
    'traço': '-',
    'hifen': '-',
    'hífen': '-',
    'underline': '_',
    'underscore': '_',
    'sublinhado': '_',
  }

  const fillerWords = new Set([
    'meu', 'email', 'e-mail', 'e', 'é', 'o', 'eh', 'seria',
  ])

  const tokens = normalized.split(/\s+/).filter(Boolean)
  const mapped = tokens
    .filter(t => !fillerWords.has(t))
    .map(t => tokenMap[t] ?? t)

  const spokenCandidate = mapped.join('')
  if (isValidEmail(spokenCandidate)) return spokenCandidate

  return null
}

// ============================================================================
// TESTS
// ============================================================================

describe('isValidEmail', () => {
  it('accepts standard emails', () => {
    expect(isValidEmail('joao@gmail.com')).toBe(true)
    expect(isValidEmail('maria.silva@outlook.com.br')).toBe(true)
    expect(isValidEmail('user_name@company.co')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('naoeumemail')).toBe(false)
    expect(isValidEmail('@gmail.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user@gmail')).toBe(false)
  })

  it('rejects synthetic telegram emails', () => {
    expect(isValidEmail('tg_12345@telegram.aica.guru')).toBe(false)
  })

  it('rejects emails over 254 chars', () => {
    const longEmail = 'a'.repeat(250) + '@b.co'
    expect(isValidEmail(longEmail)).toBe(false)
  })
})

describe('extractEmailFromText', () => {
  describe('direct email extraction', () => {
    it('extracts email from plain text', () => {
      expect(extractEmailFromText('joao@gmail.com')).toBe('joao@gmail.com')
    })

    it('extracts email embedded in a sentence', () => {
      expect(extractEmailFromText('meu email e joao@gmail.com ok')).toBe('joao@gmail.com')
    })

    it('handles uppercase input', () => {
      expect(extractEmailFromText('JOAO@GMAIL.COM')).toBe('joao@gmail.com')
    })

    it('strips trailing period from email', () => {
      expect(extractEmailFromText('meu email e maria@gmail.com.')).toBe('maria@gmail.com')
    })

    it('strips trailing comma from email', () => {
      expect(extractEmailFromText('email: joao@gmail.com, obrigado')).toBe('joao@gmail.com')
    })

    it('strips trailing exclamation from email', () => {
      expect(extractEmailFromText('joao@gmail.com!')).toBe('joao@gmail.com')
    })

    it('strips trailing semicolon from email', () => {
      expect(extractEmailFromText('joao@gmail.com;')).toBe('joao@gmail.com')
    })

    it('strips trailing parenthesis from email in sentence', () => {
      expect(extractEmailFromText('mande para joao@gmail.com)')).toBe('joao@gmail.com')
    })
  })

  describe('spoken Portuguese patterns', () => {
    it('parses "joao arroba gmail ponto com"', () => {
      expect(extractEmailFromText('joao arroba gmail ponto com')).toBe('joao@gmail.com')
    })

    it('parses with filler words: "meu email e joao arroba gmail ponto com"', () => {
      expect(extractEmailFromText('meu email e joao arroba gmail ponto com')).toBe('joao@gmail.com')
    })

    it('parses "maria arroba outlook ponto com ponto br"', () => {
      expect(extractEmailFromText('maria arroba outlook ponto com ponto br')).toBe('maria@outlook.com.br')
    })

    it('parses with hifen: "joao traco silva arroba gmail ponto com"', () => {
      expect(extractEmailFromText('joao traco silva arroba gmail ponto com')).toBe('joao-silva@gmail.com')
    })

    it('parses with underline: "joao underline silva arroba gmail ponto com"', () => {
      expect(extractEmailFromText('joao underline silva arroba gmail ponto com')).toBe('joao_silva@gmail.com')
    })

    it('parses with underscore: "joao underscore silva arroba gmail ponto com"', () => {
      expect(extractEmailFromText('joao underscore silva arroba gmail ponto com')).toBe('joao_silva@gmail.com')
    })

    it('parses with sublinhado: "joao sublinhado silva arroba gmail ponto com"', () => {
      expect(extractEmailFromText('joao sublinhado silva arroba gmail ponto com')).toBe('joao_silva@gmail.com')
    })

    it('handles accented variants: traço, hífen', () => {
      expect(extractEmailFromText('joao traço silva arroba gmail ponto com')).toBe('joao-silva@gmail.com')
      expect(extractEmailFromText('joao hífen silva arroba gmail ponto com')).toBe('joao-silva@gmail.com')
    })

    it('handles "meu e-mail e" filler', () => {
      expect(extractEmailFromText('meu e-mail e joao arroba gmail ponto com')).toBe('joao@gmail.com')
    })

    it('handles "o email seria" filler', () => {
      expect(extractEmailFromText('o email seria joao arroba gmail ponto com')).toBe('joao@gmail.com')
    })
  })

  describe('edge cases', () => {
    it('returns null for empty input', () => {
      expect(extractEmailFromText('')).toBe(null)
      expect(extractEmailFromText(null as unknown as string)).toBe(null)
    })

    it('returns null for random text', () => {
      expect(extractEmailFromText('ola tudo bem')).toBe(null)
      expect(extractEmailFromText('preciso comprar leite')).toBe(null)
    })

    it('returns null for incomplete spoken email', () => {
      expect(extractEmailFromText('joao arroba gmail')).toBe(null)
    })

    it('handles extra whitespace', () => {
      expect(extractEmailFromText('  joao@gmail.com  ')).toBe('joao@gmail.com')
    })

    it('rejects synthetic telegram emails', () => {
      expect(extractEmailFromText('tg_12345@telegram.aica.guru')).toBe(null)
    })
  })
})
