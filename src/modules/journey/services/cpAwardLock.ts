/**
 * Shared CP Award Serialization Lock
 *
 * Ensures only one CP award RPC executes at a time across all moment creation paths.
 * This is a client-side stopgap — the DB-level FOR UPDATE lock in the RPC is the
 * definitive fix (tracked in issue #936).
 *
 * P0-2: Prevents concurrent award_consciousness_points calls from double-awarding.
 */

import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('CPAwardLock')

let cpAwardInProgress = false
const cpAwardQueue: Array<() => void> = []

/**
 * Serialize CP award calls. Only one executes at a time; others queue up.
 * Uses a proper async queue pattern where cpAwardInProgress stays true
 * until the entire queue is drained.
 */
export async function serializedCPAward<T>(fn: () => Promise<T>): Promise<T> {
  if (cpAwardInProgress) {
    return new Promise<T>((resolve, reject) => {
      cpAwardQueue.push(async () => {
        try {
          resolve(await fn())
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  cpAwardInProgress = true
  try {
    return await fn()
  } finally {
    const next = cpAwardQueue.shift()
    if (next) {
      // Keep cpAwardInProgress = true while processing queue
      next()
    } else {
      cpAwardInProgress = false
    }
  }
}
