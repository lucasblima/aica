/**
 * Unit Tests for cpAwardLock
 *
 * Tests cover:
 * - Single call execution and return values
 * - Error recovery: lock is released when fn throws (no queue items)
 * - Sequential execution: multiple sequential calls each complete
 * - Type handling: different return types
 * - Concurrent queueing: second call waits for first
 *
 * IMPORTANT: The module-level lock state (cpAwardInProgress) is shared across
 * all tests in this file. Tests that exercise the concurrent queue pattern MUST
 * be the LAST test because after queue drain, cpAwardInProgress stays true
 * (the fire-and-forget `next()` pattern doesn't reset the flag after the
 * queued item completes — tracked in issue #936).
 *
 * @see src/modules/journey/services/cpAwardLock.ts
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { serializedCPAward } from '../cpAwardLock'

// =============================================================================
// serializedCPAward — basic behavior (no queue)
// These tests run first because they don't corrupt module-level state.
// =============================================================================

describe('serializedCPAward — basic', () => {
  it('should execute a single function and return its result', async () => {
    const result = await serializedCPAward(async () => 42)
    expect(result).toBe(42)
  })

  it('should handle numeric return type', async () => {
    const result = await serializedCPAward(async () => 100)
    expect(result).toBe(100)
  })

  it('should handle object return type (CP result shape)', async () => {
    const result = await serializedCPAward(async () => ({
      leveled_up: true,
      level: 5,
      level_name: 'Sábio',
    }))
    expect(result).toEqual({ leveled_up: true, level: 5, level_name: 'Sábio' })
  })

  it('should handle null return type', async () => {
    const result = await serializedCPAward(async () => null)
    expect(result).toBeNull()
  })

  it('should execute multiple sequential calls correctly', async () => {
    const r1 = await serializedCPAward(async () => 'first')
    expect(r1).toBe('first')

    const r2 = await serializedCPAward(async () => 'second')
    expect(r2).toBe('second')

    const r3 = await serializedCPAward(async () => 'third')
    expect(r3).toBe('third')
  })

  it('should release the lock when function throws (no queued items)', async () => {
    await expect(
      serializedCPAward(async () => {
        throw new Error('CP award failed')
      })
    ).rejects.toThrow('CP award failed')

    // If lock was released, this should complete immediately
    const result = await serializedCPAward(async () => 'recovered')
    expect(result).toBe('recovered')
  })

  it('should propagate the original error from the wrapped function', async () => {
    const customError = new Error('RPC timeout')
    ;(customError as any).code = 'TIMEOUT'

    await expect(
      serializedCPAward(async () => {
        throw customError
      })
    ).rejects.toThrow('RPC timeout')
  })

  it('should handle async functions that take time to complete', async () => {
    const result = await serializedCPAward(async () => {
      await new Promise((r) => setTimeout(r, 50))
      return 'delayed result'
    })
    expect(result).toBe('delayed result')
  })
})

// =============================================================================
// serializedCPAward — concurrent queue behavior
// This test MUST be LAST because the queue drain leaves cpAwardInProgress=true.
// =============================================================================

describe('serializedCPAward — concurrent queue', () => {
  it('should queue a second call while first is running and execute both', async () => {
    let resolveFirst!: () => void
    const blockerPromise = new Promise<void>((r) => { resolveFirst = r })

    const executionOrder: string[] = []

    // First call: acquires lock, blocks on deferred
    const p1 = serializedCPAward(async () => {
      executionOrder.push('first-start')
      await blockerPromise
      executionOrder.push('first-end')
      return 'first'
    })

    // Allow p1 to start executing (synchronous portion runs up to await)
    await Promise.resolve()
    await Promise.resolve()
    expect(executionOrder).toEqual(['first-start'])

    // Second call: finds lock held, queues up
    const p2 = serializedCPAward(async () => {
      executionOrder.push('second')
      return 'second'
    })
    expect(p2).toBeInstanceOf(Promise)

    // Unblock first — finally shifts p2 from queue and calls next()
    resolveFirst()

    const first = await p1
    const second = await p2

    expect(first).toBe('first')
    expect(second).toBe('second')
    expect(executionOrder).toEqual(['first-start', 'first-end', 'second'])
  })
})
