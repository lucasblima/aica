/**
 * Notification Container Component
 *
 * Displays toast notifications in a fixed position
 * Handles in-app notifications for all events
 */

import React from 'react';
import { Notification, useNotifications } from '../services/notificationService';
import './NotificationContainer.css';

export const NotificationContainer: React.FC = () => {
  const { notifications, dismiss } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => dismiss(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClose,
}) => {
  return (
    <div
      className={`notification notification-${notification.type}`}
      role="alert"
    >
      <div className="notification-content">
        {notification.icon && (
          <span className="notification-icon">{notification.icon}</span>
        )}

        <div className="notification-text">
          <h4 className="notification-title">{notification.title}</h4>
          {notification.message && (
            <p className="notification-message">{notification.message}</p>
          )}
        </div>

        {notification.action && (
          <button
            className="notification-action"
            onClick={() => {
              notification.action?.callback();
              onClose();
            }}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        className="notification-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};
