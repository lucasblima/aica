/**
 * GroupAnalyticsCard
 * WhatsApp Conversation Intelligence — Phase 4
 *
 * Displays group-level analytics: participants, activity, decisions,
 * and participant breakdown with inferred roles.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  MessageSquare,
  GitBranch,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Crown,
  Shield,
  Zap,
  User,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('GroupAnalyticsCard')

// =============================================================================
// TYPES
// =============================================================================

interface GroupAnalytics {
  total_participants: number
  active_7d: number
  total_messages: number
  total_threads: number
  total_decisions: number
  total_action_items: number
  top_topics: string[] | null
  avg_sentiment: string | null
  group_purpose: string | null
  activity_score: number
}

interface GroupParticipant {
  participant_id: string
  participant_phone: string
  participant_name: string | null
  message_count: number
  last_message_at: string | null
  first_seen_at: string
  inferred_role: string
}

export interface GroupAnalyticsCardProps {
  groupContactId: string
  className?: string
}

// =============================================================================
// HELPERS
// =============================================================================

const ROLE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}> = {
  admin: { icon: Crown, label: 'Admin', color: 'text-amber-600' },
  moderator: { icon: Shield, label: 'Moderador', color: 'text-ceramic-info' },
  active: { icon: Zap, label: 'Ativo', color: 'text-ceramic-success' },
  member: { icon: User, label: 'Membro', color: 'text-ceramic-text-secondary' },
  lurker: { icon: Eye, label: 'Observador', color: 'text-ceramic-text-tertiary' },
}

// =============================================================================
// COMPONENT
// =============================================================================

export const GroupAnalyticsCard: React.FC<GroupAnalyticsCardProps> = ({
  groupContactId,
  className,
}) => {
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null)
  const [participants, setParticipants] = useState<GroupParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch analytics and participants in parallel
      const [analyticsRes, participantsRes] = await Promise.all([
        supabase.rpc('get_group_analytics', {
          p_user_id: user.id,
          p_group_contact_id: groupContactId,
        }),
        supabase.rpc('get_group_participants', {
          p_user_id: user.id,
          p_group_contact_id: groupContactId,
        }),
      ])

      if (analyticsRes.data && analyticsRes.data.length > 0) {
        setAnalytics(analyticsRes.data[0] as GroupAnalytics)
      }

      if (participantsRes.data) {
        setParticipants(participantsRes.data as GroupParticipant[])
      }
    } catch (err) {
      log.error('Failed to fetch group analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [groupContactId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Inteligencia do Grupo
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-ceramic-accent" />
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className={cn('ceramic-card p-6 rounded-2xl space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Inteligencia do Grupo
          </h3>
          {analytics.group_purpose && (
            <p className="text-xs text-ceramic-text-secondary">{analytics.group_purpose}</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={Users}
          label="Participantes"
          value={`${analytics.active_7d}/${analytics.total_participants}`}
          sublabel="ativos 7d"
          color="text-purple-600"
        />
        <StatCard
          icon={MessageSquare}
          label="Mensagens"
          value={analytics.total_messages}
          color="text-ceramic-info"
        />
        <StatCard
          icon={GitBranch}
          label="Threads"
          value={analytics.total_threads}
          color="text-ceramic-info"
        />
        <StatCard
          icon={CheckCircle2}
          label="Decisoes"
          value={analytics.total_decisions}
          color="text-ceramic-success"
        />
        <StatCard
          icon={ListTodo}
          label="Ações"
          value={analytics.total_action_items}
          color="text-ceramic-warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Atividade"
          value={`${analytics.activity_score}/100`}
          color="text-amber-600"
        />
      </div>

      {/* Topics */}
      {analytics.top_topics && analytics.top_topics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ceramic-text-secondary mb-2">Topicos do grupo</p>
          <div className="flex flex-wrap gap-1.5">
            {analytics.top_topics.map((topic, i) => (
              <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs rounded-full font-medium">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Participants (expandable) */}
      {participants.length > 0 && (
        <div className="border-t border-ceramic-border pt-3">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="flex items-center justify-between w-full text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participantes ({participants.length})
            </span>
            {showParticipants ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showParticipants && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 space-y-2"
            >
              {participants.map(p => {
                const roleConfig = ROLE_CONFIG[p.inferred_role] || ROLE_CONFIG.member
                const RoleIcon = roleConfig.icon

                return (
                  <div key={p.participant_id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <RoleIcon className={cn('w-4 h-4', roleConfig.color)} />
                      <span className="text-sm text-ceramic-text-primary">
                        {p.participant_name || p.participant_phone}
                      </span>
                      <span className={cn('text-xs', roleConfig.color)}>
                        {roleConfig.label}
                      </span>
                    </div>
                    <span className="text-xs text-ceramic-text-secondary">
                      {p.message_count} msg
                    </span>
                  </div>
                )
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel?: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sublabel, color }) => (
  <div className="ceramic-inset p-3 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={cn('w-4 h-4', color)} />
      <span className="text-xs text-ceramic-text-secondary">{label}</span>
    </div>
    <p className="text-lg font-bold text-ceramic-text-primary">{value}</p>
    {sublabel && <p className="text-xs text-ceramic-text-tertiary">{sublabel}</p>}
  </div>
)

export default GroupAnalyticsCard
