/**
 * Notification Service
 *
 * Handles in-app notifications for:
 * - Daily report ready
 * - Gamification achievements
 * - Aica Auto suggestions
 * - Contact relationship alerts
 * - System events
 */

import { DailyReport } from '../types/memoryTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'daily_report' | 'achievement' | 'suggestion';
  title: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    callback: () => void;
  };
  duration?: number; // milliseconds, null for persistent
  timestamp: number;
  read: boolean;
}

export type NotificationCallback = (notification: Notification) => void;

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private listeners: Set<NotificationCallback> = new Set();
  private notificationId: number = 0;

  /**
   * Show a notification
   */
  show(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = `notification-${++this.notificationId}-${Date.now()}`;
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
      duration: notification.duration ?? 5000, // 5 seconds default
    };

    this.notifications.set(id, fullNotification);
    this.notifyListeners(fullNotification);

    // Auto-dismiss if duration is set
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => this.dismiss(id), fullNotification.duration);
    }

    return id;
  }

  /**
   * Show daily report notification
   */
  showDailyReportReady(report: DailyReport): string {
    const date = new Date(report.report_date);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return this.show({
      type: 'daily_report',
      title: `Your Daily Summary is Ready`,
      message: `Check out your insights and recommendations for ${formattedDate}`,
      icon: '📊',
      action: {
        label: 'View Report',
        callback: () => {
          // Callback handled by component
        },
      },
      duration: null, // Persistent until dismissed
    });
  }

  /**
   * Show achievement notification
   */
  showAchievement(
    achievement: string,
    description: string,
    icon: string = '🏆'
  ): string {
    return this.show({
      type: 'achievement',
      title: `Achievement Unlocked!`,
      message: `${achievement}: ${description}`,
      icon,
      duration: 6000,
    });
  }

  /**
   * Show Aica Auto suggestion
   */
  showSuggestion(title: string, message: string): string {
    return this.show({
      type: 'suggestion',
      title,
      message,
      icon: '✨',
      duration: 7000,
    });
  }

  /**
   * Show relationship alert
   */
  showRelationshipAlert(contactName: string, reason: string): string {
    const icons: Record<string, string> = {
      'low_health': '⚠️',
      'inactive': '👋',
      'declining_sentiment': '📉',
    };

    return this.show({
      type: 'warning',
      title: `Attention: ${contactName}`,
      message: reason,
      icon: icons[reason] || '⚠️',
      duration: null,
    });
  }

  /**
   * Show success notification
   */
  showSuccess(title: string, message: string): string {
    return this.show({
      type: 'success',
      title,
      message,
      icon: '✓',
      duration: 4000,
    });
  }

  /**
   * Show error notification
   */
  showError(title: string, message: string): string {
    return this.show({
      type: 'error',
      title,
      message,
      icon: '✕',
      duration: null,
    });
  }

  /**
   * Show info notification
   */
  showInfo(title: string, message: string): string {
    return this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ',
      duration: 4000,
    });
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    this.notifications.delete(id);
    this.notifyListeners();
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.notifications.clear();
    this.notifyListeners();
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifyListeners(notification);
    }
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get unread notifications
   */
  getUnread(): Notification[] {
    return this.getAll().filter((n) => !n.read);
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(callback: NotificationCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification?: Notification): void {
    this.listeners.forEach((callback) => {
      callback(notification || this.getAll()[0]);
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const notificationService = new NotificationManager();

// ============================================================================
// BROWSER NOTIFICATIONS (optional)
// ============================================================================

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Send browser notification
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions
): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/app-icon.png',
      ...options,
    });
  }
}

/**
 * Send daily report browser notification
 */
export function sendDailyReportNotification(date: string): void {
  sendBrowserNotification('Your Daily Summary is Ready', {
    body: `Check your insights and recommendations for ${date}`,
    tag: 'daily-report',
    requireInteraction: true,
  });
}

// ============================================================================
// NOTIFICATION CONTAINER COMPONENT
// ============================================================================

/**
 * React hook for using notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>(
    notificationService.getAll()
  );

  React.useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(notificationService.getAll());
    });

    return unsubscribe;
  }, []);

  return {
    notifications,
    dismiss: (id: string) => notificationService.dismiss(id),
    dismissAll: () => notificationService.dismissAll(),
  };
}

// Import React for the hook (assuming available in context)
import React from 'react';
