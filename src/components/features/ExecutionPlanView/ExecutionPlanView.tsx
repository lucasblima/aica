/**
 * ExecutionPlanView
 * Phase 2 — Planner Agent (Agent Orchestra Roadmap)
 *
 * Displays the execution plan progress with real-time step updates.
 * Shows goal, overall status, involved modules, and ordered steps
 * with expandable results for completed steps.
 *
 * Uses Ceramic Design System tokens throughout.
 */

import { useState } from 'react'
import type {
  ExecutionPlan,
  ExecutionPlanStep,
  PlanStatus,
  StepStatus,
} from '@/hooks/useExecutionPlan'

// =============================================================================
// MODULE COLOR MAPPING
// =============================================================================

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  atlas:        { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300' },
  journey:      { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300' },
  connections:  { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-300' },
  finance:      { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  flux:         { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300' },
  studio:       { bg: 'bg-pink-100',    text: 'text-pink-800',    border: 'border-pink-300' },
  captacao:     { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' },
  agenda:       { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-300' },
  coordinator:  { bg: 'bg-gray-100',    text: 'text-gray-800',    border: 'border-gray-300' },
}

function getModuleColor(module: string) {
  return MODULE_COLORS[module] || MODULE_COLORS.coordinator
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const PLAN_STATUS_CONFIG: Record<PlanStatus, { label: string; className: string }> = {
  pending:   { label: 'Pendente',   className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  running:   { label: 'Executando', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Concluido',  className: 'bg-green-100 text-green-800' },
  failed:    { label: 'Falhou',     className: 'bg-red-100 text-red-800' },
}

const STEP_STATUS_CONFIG: Record<
  StepStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: 'Pendente',
    icon: (
      <svg
        className="w-5 h-5 text-ceramic-text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    className: 'border-ceramic-border',
  },
  running: {
    label: 'Executando',
    icon: (
      <svg
        className="w-5 h-5 text-amber-500 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
    className: 'border-amber-300 bg-amber-50/50',
  },
  completed: {
    label: 'Concluido',
    icon: (
      <svg
        className="w-5 h-5 text-green-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    className: 'border-green-300 bg-green-50/50',
  },
  failed: {
    label: 'Falhou',
    icon: (
      <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    className: 'border-red-300 bg-red-50/50',
  },
  skipped: {
    label: 'Pulado',
    icon: (
      <svg
        className="w-5 h-5 text-ceramic-text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      </svg>
    ),
    className: 'border-ceramic-border bg-ceramic-cool/50 opacity-60',
  },
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ModulePillProps {
  module: string
}

function ModulePill({ module }: ModulePillProps) {
  const colors = getModuleColor(module)
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {module}
    </span>
  )
}

interface StatusBadgeProps {
  status: PlanStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = PLAN_STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}
    >
      {status === 'running' && (
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5" />
      )}
      {config.label}
    </span>
  )
}

interface StepCardProps {
  step: ExecutionPlanStep
}

function StepCard({ step }: StepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const stepConfig = STEP_STATUS_CONFIG[step.status]
  const moduleColors = getModuleColor(step.module)
  const hasResult = step.status === 'completed' && step.result !== null
  const hasError = step.status === 'failed' && step.error_message

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-lg border ${stepConfig.className} transition-all duration-200`}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">{stepConfig.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {/* Step number */}
          <span className="text-xs font-mono text-ceramic-text-secondary">
            #{step.step_order}
          </span>

          {/* Module badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${moduleColors.bg} ${moduleColors.text}`}
          >
            {step.module}
          </span>

          {/* Status label on small screens */}
          <span className="text-xs text-ceramic-text-secondary sm:hidden">
            {stepConfig.label}
          </span>
        </div>

        {/* Action description */}
        <p className="text-sm text-ceramic-text-primary leading-snug">
          {step.action}
        </p>

        {/* Error message */}
        {hasError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
            {step.error_message}
          </p>
        )}

        {/* Expandable result */}
        {hasResult && (
          <div className="mt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {isExpanded ? 'Ocultar resultado' : 'Ver resultado'}
            </button>
            {isExpanded && (
              <pre className="mt-2 text-xs bg-ceramic-cool rounded-lg p-3 overflow-x-auto text-ceramic-text-secondary max-h-48 overflow-y-auto">
                {JSON.stringify(step.result, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Timing info */}
        {step.completed_at && step.started_at && (
          <p className="mt-1 text-xs text-ceramic-text-secondary">
            Duracao:{' '}
            {(
              (new Date(step.completed_at).getTime() -
                new Date(step.started_at).getTime()) /
              1000
            ).toFixed(1)}
            s
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  steps: ExecutionPlanStep[]
}

function ProgressBar({ steps }: ProgressBarProps) {
  if (steps.length === 0) return null

  const completed = steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length
  const percentage = Math.round((completed / steps.length) * 100)

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-ceramic-text-secondary">Progresso</span>
        <span className="text-xs font-medium text-ceramic-text-primary">
          {completed}/{steps.length} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-ceramic-cool rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ExecutionPlanViewProps {
  plan: ExecutionPlan
  steps: ExecutionPlanStep[]
  onCancel?: () => void
}

export function ExecutionPlanView({
  plan,
  steps,
  onCancel,
}: ExecutionPlanViewProps) {
  const isActive = plan.status === 'pending' || plan.status === 'running'

  return (
    <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-6 border-b border-ceramic-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-ceramic-text-primary truncate">
                Plano de Execucao
              </h3>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
              {plan.goal}
            </p>
          </div>

          {/* Cancel button */}
          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Modules involved */}
        {plan.modules_involved.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-xs text-ceramic-text-secondary mr-1">
              Modulos:
            </span>
            {plan.modules_involved.map((mod) => (
              <ModulePill key={mod} module={mod} />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {steps.length > 0 && (
          <div className="mt-4">
            <ProgressBar steps={steps} />
          </div>
        )}

        {/* Error message for failed plan */}
        {plan.status === 'failed' && plan.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{plan.error_message}</p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* STEPS LIST                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-6">
        {steps.length === 0 ? (
          <div className="text-center py-8">
            {plan.status === 'pending' || plan.status === 'running' ? (
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="w-8 h-8 text-amber-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-ceramic-text-secondary">
                  Planejando etapas...
                </p>
              </div>
            ) : (
              <p className="text-sm text-ceramic-text-secondary">
                Nenhuma etapa encontrada.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-ceramic-text-primary mb-3">
              Etapas ({steps.length})
            </h4>
            {steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER — Timestamps                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-6 pb-4">
        <p className="text-xs text-ceramic-text-secondary">
          Criado em{' '}
          {new Date(plan.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export default ExecutionPlanView
