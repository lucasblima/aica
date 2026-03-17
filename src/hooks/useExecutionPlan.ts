/**
 * useExecutionPlan Hook
 * Phase 2 — Planner Agent (Agent Orchestra Roadmap)
 *
 * Creates cross-module execution plans via the plan-and-execute Edge Function
 * and subscribes to real-time updates on plan + step progress.
 *
 * @example
 * const { createPlan, activePlan, steps, isPlanning, error, cancelPlan } = useExecutionPlan()
 * await createPlan('Preparar episódio do podcast sobre IA generativa')
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import type { RealtimeChannel } from '@supabase/supabase-js'

const log = createNamespacedLogger('useExecutionPlan')

// =============================================================================
// TYPES
// =============================================================================

export type PlanStatus = 'pending' | 'running' | 'completed' | 'failed'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface ExecutionPlan {
  id: string
  user_id: string
  goal: string
  status: PlanStatus
  modules_involved: string[]
  context: Record<string, unknown>
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ExecutionPlanStep {
  id: string
  plan_id: string
  step_order: number
  module: string
  action: string
  status: StepStatus
  result: Record<string, unknown> | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface UseExecutionPlanReturn {
  createPlan: (goal: string, context?: Record<string, unknown>) => Promise<void>
  activePlan: ExecutionPlan | null
  steps: ExecutionPlanStep[]
  isPlanning: boolean
  error: string | null
  cancelPlan: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useExecutionPlan(): UseExecutionPlanReturn {
  const [activePlan, setActivePlan] = useState<ExecutionPlan | null>(null)
  const [steps, setSteps] = useState<ExecutionPlanStep[]>([])
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planChannelRef = useRef<RealtimeChannel | null>(null)
  const stepsChannelRef = useRef<RealtimeChannel | null>(null)

  // ---------------------------------------------------------------------------
  // Real-time subscription setup
  // ---------------------------------------------------------------------------

  const subscribeToPlan = useCallback((planId: string) => {
    // Clean up existing subscriptions
    if (planChannelRef.current) {
      supabase.removeChannel(planChannelRef.current)
    }
    if (stepsChannelRef.current) {
      supabase.removeChannel(stepsChannelRef.current)
    }

    // Subscribe to plan updates
    planChannelRef.current = supabase
      .channel(`execution_plan:${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'execution_plans',
          filter: `id=eq.${planId}`,
        },
        (payload) => {
          log.debug('Plan updated:', payload.new)
          setActivePlan(payload.new as ExecutionPlan)
        }
      )
      .subscribe((status) => {
        log.debug('Plan subscription status:', status)
      })

    // Subscribe to step updates (INSERT for new steps, UPDATE for status changes)
    stepsChannelRef.current = supabase
      .channel(`execution_plan_steps:${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_plan_steps',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          log.debug('Step inserted:', payload.new)
          setSteps((prev) => {
            const newStep = payload.new as ExecutionPlanStep
            // Avoid duplicates
            if (prev.some((s) => s.id === newStep.id)) return prev
            return [...prev, newStep].sort((a, b) => a.step_order - b.step_order)
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'execution_plan_steps',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          log.debug('Step updated:', payload.new)
          setSteps((prev) =>
            prev.map((s) =>
              s.id === (payload.new as ExecutionPlanStep).id
                ? (payload.new as ExecutionPlanStep)
                : s
            )
          )
        }
      )
      .subscribe((status) => {
        log.debug('Steps subscription status:', status)
      })
  }, [])

  // ---------------------------------------------------------------------------
  // Cleanup subscriptions on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (planChannelRef.current) {
        supabase.removeChannel(planChannelRef.current)
      }
      if (stepsChannelRef.current) {
        supabase.removeChannel(stepsChannelRef.current)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Create a new execution plan
  // ---------------------------------------------------------------------------

  const createPlan = useCallback(
    async (goal: string, context?: Record<string, unknown>) => {
      if (!goal.trim()) return

      setIsPlanning(true)
      setError(null)
      setActivePlan(null)
      setSteps([])

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Não autenticado')

        const { data, error: fnError } = await supabase.functions.invoke(
          'plan-and-execute',
          {
            body: {
              action: 'create_plan',
              payload: { goal: goal.trim(), context: context || {} },
            },
          }
        )

        if (fnError) throw fnError

        if (!data?.success) {
          throw new Error(
            data?.error || 'Falha ao criar plano de execução'
          )
        }

        const planData = data.plan
        const plan = planData as ExecutionPlan
        const planSteps = (planData.steps as ExecutionPlanStep[]) || []

        setActivePlan(plan)
        setSteps(planSteps.sort((a, b) => a.step_order - b.step_order))

        // Subscribe to real-time updates for this plan
        subscribeToPlan(plan.id)

        log.info('Plan created:', { planId: plan.id, goal, stepsCount: planSteps.length })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar plano de execução'
        log.error('createPlan error:', err)
        setError(message)
      } finally {
        setIsPlanning(false)
      }
    },
    [subscribeToPlan]
  )

  // ---------------------------------------------------------------------------
  // Cancel the active plan
  // ---------------------------------------------------------------------------

  const cancelPlan = useCallback(async () => {
    if (!activePlan) return

    try {
      const { error: updateError } = await supabase
        .from('execution_plans')
        .update({ status: 'failed', error_message: 'Cancelado pelo usuario' })
        .eq('id', activePlan.id)

      if (updateError) throw updateError

      setActivePlan((prev) =>
        prev
          ? { ...prev, status: 'failed', error_message: 'Cancelado pelo usuario' }
          : null
      )

      log.info('Plan cancelled:', { planId: activePlan.id })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao cancelar plano'
      log.error('cancelPlan error:', err)
      setError(message)
    }
  }, [activePlan])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    createPlan,
    activePlan,
    steps,
    isPlanning,
    error,
    cancelPlan,
  }
}
