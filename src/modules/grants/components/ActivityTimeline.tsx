/**
 * ActivityTimeline Component
 * Issue #101 - Timeline de atividades de prospeccao
 *
 * @module modules/grants/components/ActivityTimeline
 */

import React from 'react';
import {
  Send,
  Mail,
  PhoneOutgoing,
  PhoneIncoming,
  Users,
  FileText,
  RefreshCw,
  MessageSquare,
  FileSignature,
  CheckCircle,
  StickyNote,
  MoreHorizontal,
  Clock,
  Calendar,
  Building2,
  ChevronRight,
} from 'lucide-react';
import type { ProspectActivity, ActivityType, ActivityOutcome } from '../types/prospect';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_OUTCOME_LABELS,
  ACTIVITY_OUTCOME_COLORS,
} from '../types/prospect';

interface ActivityTimelineProps {
  activities: ProspectActivity[];
  loading?: boolean;
  showSponsorInfo?: boolean;
  maxItems?: number;
  onActivityClick?: (activity: ProspectActivity) => void;
  emptyMessage?: string;
}

// Mapeamento de icones Lucide
const ICON_MAP: Record<ActivityType, React.FC<{ className?: string }>> = {
  email_sent: Send,
  email_received: Mail,
  call_outbound: PhoneOutgoing,
  call_inbound: PhoneIncoming,
  meeting: Users,
  proposal_sent: FileText,
  follow_up: RefreshCw,
  negotiation: MessageSquare,
  contract_sent: FileSignature,
  contract_signed: CheckCircle,
  note: StickyNote,
  other: MoreHorizontal,
};

interface ActivityItemProps {
  activity: ProspectActivity;
  showSponsorInfo?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

function ActivityItem({ activity, showSponsorInfo, isLast, onClick }: ActivityItemProps) {
  const Icon = ICON_MAP[activity.activity_type];
  const color = ACTIVITY_TYPE_COLORS[activity.activity_type];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) {
      return `${diffDays} dias atras`;
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined,
    });
  };

  return (
    <div
      className={`
        relative flex gap-4 pb-6 cursor-pointer
        hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors
      `}
      onClick={onClick}
    >
      {/* Timeline connector */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">{activity.title}</p>
            <p className="text-sm text-gray-500">
              {ACTIVITY_TYPE_LABELS[activity.activity_type]}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatDate(activity.activity_date)}
          </div>
        </div>

        {/* Sponsor info (when showing multiple sponsors) */}
        {showSponsorInfo && activity.sponsor && (
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4" />
            <span>{activity.sponsor.company_name || activity.sponsor.contact_name}</span>
            {activity.sponsor.project && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">{activity.sponsor.project.project_name}</span>
              </>
            )}
          </div>
        )}

        {/* Description */}
        {activity.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Outcome badge */}
        {activity.outcome && (
          <div className="mt-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${ACTIVITY_OUTCOME_COLORS[activity.outcome]}15`,
                color: ACTIVITY_OUTCOME_COLORS[activity.outcome],
              }}
            >
              {ACTIVITY_OUTCOME_LABELS[activity.outcome]}
            </span>
          </div>
        )}

        {/* Next action */}
        {activity.next_action && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium">Proxima acao:</span>
            </div>
            <p className="mt-1 text-blue-600">{activity.next_action}</p>
            {activity.next_action_date && (
              <p className="mt-1 text-xs text-blue-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(activity.next_action_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* Duration (for calls and meetings) */}
        {activity.duration_minutes && (
          <p className="mt-2 text-xs text-gray-400">
            Duracao: {activity.duration_minutes} min
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Timeline de atividades de prospeccao
 */
export function ActivityTimeline({
  activities,
  loading = false,
  showSponsorInfo = false,
  maxItems,
  onActivityClick,
  emptyMessage = 'Nenhuma atividade registrada',
}: ActivityTimelineProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;
  const hasMore = maxItems && activities.length > maxItems;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {displayActivities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          showSponsorInfo={showSponsorInfo}
          isLast={index === displayActivities.length - 1}
          onClick={() => onActivityClick?.(activity)}
        />
      ))}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => {
              // Poderia disparar um evento para mostrar mais
            }}
          >
            Ver mais {activities.length - maxItems!} atividades
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ActivitySummary - Resumo compacto de atividades
// =============================================================================

interface ActivitySummaryProps {
  activities: ProspectActivity[];
  className?: string;
}

export function ActivitySummary({ activities, className }: ActivitySummaryProps) {
  const stats = React.useMemo(() => {
    const byType: Record<string, number> = {};
    let lastActivity: ProspectActivity | null = null;

    for (const activity of activities) {
      byType[activity.activity_type] = (byType[activity.activity_type] || 0) + 1;
      if (!lastActivity || new Date(activity.activity_date) > new Date(lastActivity.activity_date)) {
        lastActivity = activity;
      }
    }

    // Top 3 tipos de atividade
    const topTypes = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total: activities.length, topTypes, lastActivity };
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className={`text-sm text-gray-400 ${className}`}>
        Sem atividades registradas
      </div>
    );
  }

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-center gap-4 text-gray-600">
        <span>{stats.total} atividades</span>
        {stats.lastActivity && (
          <span className="text-gray-400">
            Ultima: {ACTIVITY_TYPE_LABELS[stats.lastActivity.activity_type]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {stats.topTypes.map(([type, count]) => {
          const Icon = ICON_MAP[type as ActivityType];
          const color = ACTIVITY_TYPE_COLORS[type as ActivityType];
          return (
            <div
              key={type}
              className="flex items-center gap-1 text-xs"
              title={`${count}x ${ACTIVITY_TYPE_LABELS[type as ActivityType]}`}
            >
              <Icon className="w-3 h-3" style={{ color }} />
              <span style={{ color }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityTimeline;
