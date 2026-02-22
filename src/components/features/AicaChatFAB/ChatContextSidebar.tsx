import React from 'react'
import type { UserAIContext } from '@/services/userAIContextService'

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
        <ListCard title="Momentos Recentes" items={context.recentMoments} accentColor="text-teal-500" />
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
          <StatCard title="Tarefas Pendentes" value={context.pendingTasks} label="no Atlas" accentColor="text-blue-500" />
          {context.financeSummary && (
            <StatCard title="Saldo do Mes" value={formatCurrency(context.financeSummary.balance)} accentColor="text-amber-500" />
          )}
          <StatCard title="Momentos" value={context.recentMoments.length} label="registrados recentemente" accentColor="text-teal-500" />
          <StatCard title="Proximos Eventos" value={context.upcomingEvents?.length ?? 0} label="na agenda" accentColor="text-indigo-500" />
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
