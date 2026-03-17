// src/telegram-mini-app/components/DailySummary.tsx
import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SummarySection } from './SummarySection'
import type { MiniAppUser } from '../services/miniAppAuthService'

interface DailySummaryProps {
  user: MiniAppUser
  supabase: SupabaseClient
}

// Date helpers (BRT)
function getTodayBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getGreeting(): string {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(hour, 10)
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatDateBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

interface TaskItem {
  id: string
  title: string
  priority: string
  status: string
}

interface FinanceData {
  spent: number
  budget: number
}

interface MoodData {
  lastScore: number | null
  trend: 'up' | 'down' | 'stable' | null
}

interface EventItem {
  id: string
  title: string
  start_time: string
}

export function DailySummary({ user, supabase }: DailySummaryProps) {
  const today = getTodayBRT()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [mood, setMood] = useState<MoodData | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingFinance, setLoadingFinance] = useState(true)
  const [loadingMood, setLoadingMood] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Fetch tasks
  useEffect(() => {
    supabase
      .from('work_items')
      .select('id, title, priority, status')
      .neq('status', 'done')
      .order('priority', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        setTasks(data || [])
        setLoadingTasks(false)
      })
  }, [supabase])

  // Fetch finance (current month)
  useEffect(() => {
    const [year, month] = today.split('-')
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    supabase
      .from('finance_transactions')
      .select('amount')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .eq('type', 'expense')
      .then(({ data }) => {
        const spent = (data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0)
        setFinance({ spent, budget: 5000 }) // TODO: fetch actual budget
        setLoadingFinance(false)
      })
  }, [supabase, today])

  // Fetch mood (last entry)
  useEffect(() => {
    supabase
      .from('moments')
      .select('emotion, sentiment_data, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const score = data[0].sentiment_data?.mood_score ?? null
          setMood({ lastScore: score, trend: null })
        }
        setLoadingMood(false)
      })
  }, [supabase])

  // Fetch events (today)
  useEffect(() => {
    supabase
      .from('calendar_events')
      .select('id, title, start_time')
      .gte('start_time', `${today}T00:00:00-03:00`)
      .lte('start_time', `${today}T23:59:59-03:00`)
      .order('start_time', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        setEvents(data || [])
        setLoadingEvents(false)
      })
  }, [supabase, today])

  const priorityEmoji: Record<string, string> = {
    urgent_important: '🔴',
    important: '🟡',
    urgent: '🟠',
    delegate: '🟢',
  }

  const moodEmoji: Record<number, string> = {
    1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
  }

  return (
    <>
      {/* Greeting */}
      <div className="mb-2">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          {getGreeting()}, {user.display_name.split(' ')[0]}!
        </h1>
        <p className="text-sm capitalize" style={{ color: 'var(--tg-hint-color)' }}>
          {formatDateBR()}
        </p>
      </div>

      {/* Tasks */}
      <SummarySection icon="✅" title="Tarefas" isLoading={loadingTasks}>
        {tasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Nenhuma tarefa pendente!
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <span>{priorityEmoji[t.priority] || '⚪'}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>

      {/* Finance */}
      <SummarySection icon="💰" title="Finanças do mes" isLoading={loadingFinance}>
        {finance && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>R$ {finance.spent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
              <span style={{ color: 'var(--tg-hint-color)' }}>
                / R$ {finance.budget.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--tg-bg-color)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((finance.spent / finance.budget) * 100, 100)}%`,
                  backgroundColor: finance.spent > finance.budget * 0.8
                    ? 'var(--tg-destructive-text-color)'
                    : 'var(--tg-button-color)',
                }}
              />
            </div>
          </div>
        )}
      </SummarySection>

      {/* Mood */}
      <SummarySection icon="😊" title="Humor" isLoading={loadingMood}>
        {mood?.lastScore ? (
          <p className="text-sm">
            Último check-in: {moodEmoji[mood.lastScore] || '😐'} {mood.lastScore}/5
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Nenhum check-in registrado hoje
          </p>
        )}
      </SummarySection>

      {/* Agenda */}
      <SummarySection icon="📅" title="Agenda" isLoading={loadingEvents}>
        {events.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Sem eventos hoje
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--tg-accent-text-color)' }}>
                  {new Date(e.start_time).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>
    </>
  )
}
