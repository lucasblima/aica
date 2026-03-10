/**
 * AgentNotificationBell Component
 * Sprint: Agentes Autônomos
 *
 * Bell icon notification component for autonomous agent notifications.
 * Shows unread badge count, opens a dropdown panel with notification list.
 * Each notification shows: agent emoji, type badge with color, relative time,
 * title, and body (2 lines max). Supports mark-as-read per notification
 * and "Ler todas" (mark all as read).
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useAgentNotifications, type AgentNotification } from '@/hooks/useAgentNotifications';

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_ICONS: Record<string, string> = {
  morning_briefing: '🌅',
  deadline_watcher: '⏰',
  pattern_analyzer: '🔍',
  life_council: '🧠',
  session_cleanup: '🧹',
};

const TYPE_COLORS: Record<string, string> = {
  insight: 'bg-ceramic-info/10 text-ceramic-info',
  deadline: 'bg-ceramic-warning/10 text-ceramic-warning',
  pattern: 'bg-ceramic-success/10 text-ceramic-success',
  action: 'bg-amber-100 text-amber-700',
  system: 'bg-ceramic-cool text-ceramic-text-secondary',
};

const TYPE_LABELS: Record<string, string> = {
  insight: 'Insight',
  deadline: 'Prazo',
  pattern: 'Padrão',
  action: 'Ação',
  system: 'Sistema',
};

// ============================================================================
// HELPERS
// ============================================================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AgentNotification;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = !notification.read_at;
  const timeAgo = getRelativeTime(notification.created_at);

  return (
    <div
      className={`px-4 py-3 border-b border-ceramic-border last:border-0 ${
        isUnread ? 'bg-amber-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">
          {AGENT_ICONS[notification.agent_name] || '🤖'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                TYPE_COLORS[notification.notification_type] || TYPE_COLORS.system
              }`}
            >
              {TYPE_LABELS[notification.notification_type] || notification.notification_type}
            </span>
            <span className="text-xs text-ceramic-text-secondary">{timeAgo}</span>
          </div>
          <p className="text-sm font-medium text-ceramic-text-primary mt-1">
            {notification.title}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        </div>
        {isUnread && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 text-ceramic-text-secondary hover:text-ceramic-success transition-colors"
            title="Marcar como lida"
          >
            <Check size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgentNotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useAgentNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        aria-label={`Notificações de agentes${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-ceramic-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-ceramic-base rounded-xl shadow-ceramic-emboss border border-ceramic-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ceramic-border">
            <h3 className="text-sm font-medium text-ceramic-text-primary">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-ceramic-info hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Ler todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-ceramic-text-secondary hover:text-ceramic-text-primary"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-ceramic-text-secondary">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ceramic-text-secondary">
                Nenhuma notificação ainda
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markAsRead([id])}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentNotificationBell;
