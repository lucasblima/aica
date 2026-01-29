/**
 * NotificationBell Component
 * Issue #173: Notification Scheduler System
 *
 * Bell icon with badge showing unread notification count
 * Opens dropdown with recent notifications
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './NotificationBell.css';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        className="notification-bell__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-bell__dropdown">
          {/* Header */}
          <div className="notification-bell__header">
            <h3>Notificações</h3>
            <div className="notification-bell__actions">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="notification-bell__action-btn"
                aria-label="Atualizar"
              >
                <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="notification-bell__action-btn"
                  aria-label="Marcar todas como lidas"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="notification-bell__list">
            {notifications.length === 0 ? (
              <div className="notification-bell__empty">
                <Bell size={32} opacity={0.3} />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-bell__item ${
                    !notification.read_at ? 'notification-bell__item--unread' : ''
                  }`}
                >
                  <div className="notification-bell__item-content">
                    <div className="notification-bell__item-header">
                      <span className="notification-bell__item-title">{notification.title}</span>
                      <span className="notification-bell__item-time">
                        {formatDistanceToNow(new Date(notification.scheduled_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="notification-bell__item-body">{notification.body}</p>
                    )}
                  </div>

                  <div className="notification-bell__item-actions">
                    {!notification.read_at && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="notification-bell__item-action"
                        aria-label="Marcar como lida"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="notification-bell__item-action"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notification-bell__footer">
              <button className="notification-bell__view-all">Ver todas</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
