/**
 * useFlowZone Hook
 * Computes current flow zone state based on time-of-day + cognitive profile.
 * Updates every 15 minutes.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import {
  computeFlowZoneState,
  type CognitiveProfile,
  type FlowZoneState,
} from '../services/atlasScoring'

const log = createNamespacedLogger('useFlowZone')

const UPDATE_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

interface UseFlowZoneReturn {
  isInFlowZone: boolean
  flowProbability: number
  currentEnergyLevel: 'peak' | 'sustain' | 'rest'
  optimalTaskTypes: Array<'low' | 'medium' | 'high'>
  nextFlowWindow: { start: number; end: number } | null
  refresh: () => void
}

export function useFlowZone(profile: CognitiveProfile | null): UseFlowZoneReturn {
  const [state, setState] = useState<FlowZoneState>({
    isInFlowZone: false,
    flowProbability: 0,
    currentEnergyLevel: 'rest',
    optimalTaskTypes: ['low'],
    nextFlowWindow: null,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const compute = useCallback(() => {
    if (!profile) return

    try {
      const flowState = computeFlowZoneState(profile)
      setState(flowState)
    } catch (err) {
      log.error('Error computing flow zone:', err)
    }
  }, [profile])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    compute()
    /* eslint-enable react-hooks/set-state-in-effect */

    intervalRef.current = setInterval(compute, UPDATE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [compute])

  return {
    isInFlowZone: state.isInFlowZone,
    flowProbability: state.flowProbability,
    currentEnergyLevel: state.currentEnergyLevel,
    optimalTaskTypes: state.optimalTaskTypes,
    nextFlowWindow: state.nextFlowWindow,
    refresh: compute,
  }
}
