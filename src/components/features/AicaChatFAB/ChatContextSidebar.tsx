import React from 'react'
import type { UserAIContext, UserPattern, LifeCouncilInsight } from '@/services/userAIContextService'

interface ChatContextSidebarProps {
  activeModule: string
  context: UserAIContext | null
  isLoading: boolean
}

function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    atlas: 'Atlas',
    finance: 'Financas',
    journey: 'Jornada',
    agenda: 'Agenda',
    studio: 'Studio',
    captacao: 'Captacao',
  }
  return labels[module] || module
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatEventTime(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Hoje ${time}`
  if (isTomorrow) return `Amanha ${time}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ` ${time}`
}

function StatCard({ title, value, label, accentColor }: { title: string; value: string | number; label?: string; accentColor: string }) {
  return (
    <div className="aica-context-card">
      <p className={`aica-context-card__title ${accentColor}`}>{title}</p>
      <p className="aica-context-card__value">{value}</p>
      {label && <p className="aica-context-card__label">{label}</p>}
    </div>
  )
}

function ListCard({ title, items, accentColor }: { title: string; items: string[]; accentColor: string }) {
  return (
    <div className="aica-context-card">
      <p className={`aica-context-card__title ${accentColor}`}>{title}</p>
      {items.length > 0 ? (
        <ul className="aica-context-card__list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <p className="aica-context-card__label">Nenhum item</p>
      )}
    </div>
  )
}

const PATTERN_LABELS: Record<string, string> = {
  productivity: 'Produtividade',
  emotional: 'Emocional',
  routine: 'Rotina',
  social: 'Social',
  health: 'Saude',
  learning: 'Aprendizado',
  trigger: 'Gatilho',
  strength: 'Forca',
}

function PatternsCard({ patterns }: { patterns: UserPattern[] }) {
  if (!patterns.length) return null
  return (
    <div className="aica-context-card">
      <p className="aica-context-card__title text-violet-500">Seus Padroes</p>
      <ul className="aica-context-card__list">
        {patterns.map((p, i) => (
          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.description}
            </span>
            <span style={{
              fontSize: 10,
              padding: '1px 5px',
              borderRadius: 8,
              background: p.confidence >= 0.8 ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.12)',
              color: p.confidence >= 0.8 ? '#059669' : '#7c3aed',
              whiteSpace: 'nowrap',
            }}>
              {PATTERN_LABELS[p.patternType] || p.patternType} {(p.confidence * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightCard({ insight }: { insight: LifeCouncilInsight }) {
  const statusColors: Record<string, string> = {
    thriving: '#059669',
    balanced: '#2563eb',
    strained: '#d97706',
    burnout_risk: '#dc2626',
  }
  const statusLabels: Record<string, string> = {
    thriving: 'Otimo',
    balanced: 'Equilibrado',
    strained: 'Tensionado',
    burnout_risk: 'Risco',
  }
  const color = statusColors[insight.overallStatus] || '#6b7280'
  const label = statusLabels[insight.overallStatus] || insight.overallStatus

  return (
    <div className="aica-context-card">
      <p className="aica-context-card__title text-cyan-600">
        Insight do Dia
        <span style={{
          marginLeft: 6,
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 8,
          background: `${color}18`,
          color,
        }}>
          {label}
        </span>
      </p>
      {insight.headline && (
        <p style={{ fontSize: 12, fontWeight: 500, margin: '4px 0 2px' }}>{insight.headline}</p>
      )}
      {insight.actionItems.length > 0 && (
        <ul className="aica-context-card__list">
          {insight.actionItems.slice(0, 2).map((item, i) => (
            <li key={i}>{typeof item === 'string' ? item : item.action}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ContextSummaryCard({ context }: { context: UserAIContext }) {
  const summaryParts: string[] = []
  if (context.pendingTasks > 0) summaryParts.push(`${context.pendingTasks} tarefa${context.pendingTasks > 1 ? 's' : ''} pendente${context.pendingTasks > 1 ? 's' : ''}`)
  if (context.completedTasksToday > 0) summaryParts.push(`${context.completedTasksToday} concluida${context.completedTasksToday > 1 ? 's' : ''} hoje`)
  if (context.recentMoments.length > 0) summaryParts.push(`${context.recentMoments.length} momento${context.recentMoments.length > 1 ? 's' : ''} recente${context.recentMoments.length > 1 ? 's' : ''}`)
  if (context.financeSummary) summaryParts.push(`saldo ${context.financeSummary.balance >= 0 ? 'positivo' : 'negativo'}`)

  if (summaryParts.length === 0) return null

  return (
    <div className="aica-context-card">
      <p className="aica-context-card__title text-cyan-600">Resumo do Dia</p>
      <p style={{ fontSize: 12, margin: '4px 0 2px' }}>
        Voce tem {summaryParts.join(', ')}.
      </p>
      <p className="aica-context-card__label">
        Pergunte ao AICA para analisar seu dia
      </p>
    </div>
  )
}

function renderCards(module: string, context: UserAIContext): React.ReactNode {
  switch (module) {
    case 'atlas':
      return (
        <>
          <StatCard title="Tarefas Pendentes" value={context.pendingTasks} accentColor="text-blue-500" />
          <StatCard title="Concluidas Hoje" value={context.completedTasksToday} accentColor="text-blue-500" />
        </>
      )
    case 'finance':
      return (
        <>
          <StatCard title="Receitas do Mes" value={formatCurrency(context.financeSummary?.monthlyIncome ?? 0)} accentColor="text-amber-500" />
          <StatCard title="Despesas do Mes" value={formatCurrency(context.financeSummary?.monthlyExpenses ?? 0)} accentColor="text-amber-500" />
          <StatCard
            title="Saldo"
            value={formatCurrency(context.financeSummary?.balance ?? 0)}
            accentColor={(context.financeSummary?.balance ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}
          />
        </>
      )
    case 'journey':
      return (
        <>
          <ListCard title="Momentos Recentes" items={context.recentMoments} accentColor="text-teal-500" />
          {context.latestInsight ? <InsightCard insight={context.latestInsight} /> : <ContextSummaryCard context={context} />}
          <PatternsCard patterns={context.patterns.filter(p => ['emotional', 'trigger', 'strength'].includes(p.patternType))} />
        </>
      )
    case 'agenda':
      return (
        <ListCard
          title="Proximos Eventos"
          items={(context.upcomingEvents || []).map(e => `${formatEventTime(e.startTime)} — ${e.title}`)}
          accentColor="text-indigo-500"
        />
      )
    case 'studio':
      return (
        <StatCard title="Episodios Planejados" value={context.upcomingEpisodes} accentColor="text-rose-500" />
      )
    case 'captacao':
      return (
        <StatCard title="Projetos Ativos" value={context.activeGrants} accentColor="text-purple-500" />
      )
    default: // coordinator overview
      return (
        <>
          {context.latestInsight ? <InsightCard insight={context.latestInsight} /> : <ContextSummaryCard context={context} />}
          <StatCard title="Tarefas Pendentes" value={context.pendingTasks} label="no Atlas" accentColor="text-blue-500" />
          {context.financeSummary && (
            <StatCard title="Saldo do Mes" value={formatCurrency(context.financeSummary.balance)} accentColor="text-amber-500" />
          )}
          <StatCard title="Momentos" value={context.recentMoments.length} label="registrados recentemente" accentColor="text-teal-500" />
          {(context.upcomingEvents?.length ?? 0) > 0 && (
            <ListCard
              title="Proximos Eventos"
              items={(context.upcomingEvents || []).slice(0, 3).map(e => `${formatEventTime(e.startTime)} — ${e.title}`)}
              accentColor="text-indigo-500"
            />
          )}
          <PatternsCard patterns={context.patterns} />
        </>
      )
  }
}

export function ChatContextSidebar({ activeModule, context, isLoading }: ChatContextSidebarProps) {
  if (isLoading) {
    return (
      <div className="aica-context-sidebar">
        <div className="aica-context-sidebar__header">Contexto</div>
        <div className="aica-context-skeleton" />
        <div className="aica-context-skeleton" />
      </div>
    )
  }

  if (!context) {
    return (
      <div className="aica-context-sidebar">
        <div className="aica-context-sidebar__header">Contexto</div>
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', padding: '0 4px' }}>
          Sem dados disponiveis
        </p>
      </div>
    )
  }

  return (
    <div className="aica-context-sidebar">
      <div className="aica-context-sidebar__header">
        Contexto {activeModule !== 'coordinator' ? `— ${getModuleLabel(activeModule)}` : ''}
      </div>
      {renderCards(activeModule, context)}
    </div>
  )
}
