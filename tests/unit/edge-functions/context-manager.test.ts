import { describe, it, expect } from 'vitest'
import { truncateReference, buildContextBudget } from '../../../supabase/functions/_shared/context-manager'

describe('truncateReference', () => {
  it('returns text unchanged if under limit', () => {
    expect(truncateReference('short text', 100)).toBe('short text')
  })

  it('returns text unchanged at exactly the limit', () => {
    const text = 'a'.repeat(4000)
    expect(truncateReference(text, 4000)).toBe(text)
  })

  it('truncates long text with indicator', () => {
    const long = 'a'.repeat(5000)
    const result = truncateReference(long, 100)
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result).toContain('[... truncated ...]')
  })

  it('keeps start and end of text', () => {
    const text = 'START_MARKER' + 'x'.repeat(5000) + 'END_MARKER'
    const result = truncateReference(text, 200)
    expect(result.startsWith('START_MARKER')).toBe(true)
    expect(result.endsWith('END_MARKER')).toBe(true)
  })

  it('uses default maxChars of 4000', () => {
    const text = 'a'.repeat(5000)
    const result = truncateReference(text)
    expect(result.length).toBeLessThanOrEqual(4000)
  })

  it('handles empty string', () => {
    expect(truncateReference('')).toBe('')
  })
})

describe('buildContextBudget', () => {
  it('distributes budget evenly across observations', () => {
    const obs = ['a'.repeat(5000), 'b'.repeat(5000), 'c'.repeat(5000)]
    const result = buildContextBudget(obs, 9000)
    result.forEach(r => expect(r.length).toBeLessThanOrEqual(3000))
    expect(result).toHaveLength(3)
  })

  it('returns unchanged if all observations under budget', () => {
    const obs = ['short', 'text']
    const result = buildContextBudget(obs, 10000)
    expect(result).toEqual(['short', 'text'])
  })

  it('handles empty array', () => {
    expect(buildContextBudget([])).toEqual([])
  })

  it('handles single observation', () => {
    const obs = ['a'.repeat(20000)]
    const result = buildContextBudget(obs, 16000)
    expect(result[0].length).toBeLessThanOrEqual(16000)
  })

  it('uses default budget of 16000', () => {
    const obs = ['a'.repeat(20000), 'b'.repeat(20000)]
    const result = buildContextBudget(obs)
    result.forEach(r => expect(r.length).toBeLessThanOrEqual(8000))
  })
})
