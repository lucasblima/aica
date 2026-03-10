import { describe, it, expect } from 'vitest'
import {
  calculateTrustLevel,
  getTrustLevelLabel,
  getTrustProgress,
  type UserStats,
} from '../trustLevel'

const newUser: UserStats = {
  totalMoments: 0,
  totalTasks: 0,
  daysActive: 0,
  modulesUsed: 1,
}

describe('calculateTrustLevel', () => {
  it('returns suggest_confirm for a new user', () => {
    expect(calculateTrustLevel(newUser)).toBe('suggest_confirm')
  })

  it('returns execute_validate when user has 50 moments and 14 days active', () => {
    const stats: UserStats = {
      ...newUser,
      totalMoments: 50,
      daysActive: 14,
    }
    expect(calculateTrustLevel(stats)).toBe('execute_validate')
  })

  it('returns execute_validate when user has 30 tasks and 14 days active', () => {
    const stats: UserStats = {
      ...newUser,
      totalTasks: 30,
      daysActive: 14,
    }
    expect(calculateTrustLevel(stats)).toBe('execute_validate')
  })

  it('stays suggest_confirm when just under execute_validate thresholds', () => {
    // 49 moments (need 50), 29 tasks (need 30), 14 days — neither content threshold met
    const stats: UserStats = {
      ...newUser,
      totalMoments: 49,
      totalTasks: 29,
      daysActive: 14,
    }
    expect(calculateTrustLevel(stats)).toBe('suggest_confirm')

    // 50 moments but only 13 days (need 14)
    const stats2: UserStats = {
      ...newUser,
      totalMoments: 50,
      daysActive: 13,
    }
    expect(calculateTrustLevel(stats2)).toBe('suggest_confirm')
  })

  it('returns jarvis for a power user meeting all criteria', () => {
    const stats: UserStats = {
      totalMoments: 200,
      totalTasks: 100,
      daysActive: 60,
      modulesUsed: 5,
    }
    expect(calculateTrustLevel(stats)).toBe('jarvis')
  })

  it('stays at execute_validate when missing one jarvis criterion', () => {
    // Missing modulesUsed (4 < 5)
    const missingModules: UserStats = {
      totalMoments: 200,
      totalTasks: 100,
      daysActive: 60,
      modulesUsed: 4,
    }
    expect(calculateTrustLevel(missingModules)).toBe('execute_validate')

    // Missing daysActive (59 < 60)
    const missingDays: UserStats = {
      totalMoments: 200,
      totalTasks: 100,
      daysActive: 59,
      modulesUsed: 5,
    }
    expect(calculateTrustLevel(missingDays)).toBe('execute_validate')

    // Missing totalTasks (99 < 100)
    const missingTasks: UserStats = {
      totalMoments: 200,
      totalTasks: 99,
      daysActive: 60,
      modulesUsed: 5,
    }
    expect(calculateTrustLevel(missingTasks)).toBe('execute_validate')

    // Missing totalMoments (199 < 200)
    const missingMoments: UserStats = {
      totalMoments: 199,
      totalTasks: 100,
      daysActive: 60,
      modulesUsed: 5,
    }
    expect(calculateTrustLevel(missingMoments)).toBe('execute_validate')
  })
})

describe('getTrustLevelLabel', () => {
  it('returns correct Portuguese labels', () => {
    expect(getTrustLevelLabel('suggest_confirm')).toBe('Sugerir e Confirmar')
    expect(getTrustLevelLabel('execute_validate')).toBe('Executar e Validar')
    expect(getTrustLevelLabel('jarvis')).toBe('Modo Jarvis')
  })
})

describe('getTrustProgress', () => {
  it('returns progress=1 and nextLevel=null at jarvis', () => {
    const stats: UserStats = {
      totalMoments: 200,
      totalTasks: 100,
      daysActive: 60,
      modulesUsed: 5,
    }
    const result = getTrustProgress(stats)
    expect(result.current).toBe('jarvis')
    expect(result.nextLevel).toBeNull()
    expect(result.progress).toBe(1)
  })

  it('returns correct fractional progress for intermediate user toward jarvis', () => {
    // User at execute_validate level, partially toward jarvis
    // moments: 100/200 = 0.5, tasks: 50/100 = 0.5, days: 30/60 = 0.5, modules: 3/5 = 0.6
    // average = (0.5 + 0.5 + 0.5 + 0.6) / 4 = 0.525
    const stats: UserStats = {
      totalMoments: 100,
      totalTasks: 50,
      daysActive: 30,
      modulesUsed: 3,
    }
    const result = getTrustProgress(stats)
    expect(result.current).toBe('execute_validate')
    expect(result.nextLevel).toBe('jarvis')
    expect(result.progress).toBeCloseTo(0.525, 3)
  })

  it('returns correct fractional progress for new user toward execute_validate', () => {
    // moments: 25/50 = 0.5, tasks: 15/30 = 0.5, days: 7/14 = 0.5
    // average = (0.5 + 0.5 + 0.5) / 3 = 0.5
    const stats: UserStats = {
      totalMoments: 25,
      totalTasks: 15,
      daysActive: 7,
      modulesUsed: 1,
        }
    const result = getTrustProgress(stats)
    expect(result.current).toBe('suggest_confirm')
    expect(result.nextLevel).toBe('execute_validate')
    expect(result.progress).toBeCloseTo(0.5, 3)
  })
})
