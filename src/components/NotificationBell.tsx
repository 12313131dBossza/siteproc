'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';


export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order_approved':
      case 'expense_approved':
        return '✅';
      case 'order_rejected':
      case 'expense_rejected':
        return '❌';
      case 'delivery_status':
        return '🚚';
      case 'payment_created':
      case 'payment_updated':
        return '💰';
      case 'project_update':
        return '📊';
      case 'new_message':
        return '💬';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-1">No notifications</h4>
                <p className="text-gray-500 text-sm">You're all caught up!</p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
                <div key={dateKey} className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-2 bg-gray-50">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase">{dateKey}</h4>
                  </div>
                  {dateNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "group relative border-b border-gray-100 last:border-0 transition-colors",
                        notification.read ? "bg-white hover:bg-gray-50" : "bg-blue-50 hover:bg-blue-100"
                      )}
                    >
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => handleNotificationClick(notification)}
                          className="block p-4"
                        >
                          <NotificationContent notification={notification} getNotificationIcon={getNotificationIcon} />
                        </Link>
                      ) : (
                        <div
                          onClick={() => handleNotificationClick(notification)}
                          className="p-4 cursor-pointer"
                        >
                          <NotificationContent notification={notification} getNotificationIcon={getNotificationIcon} />
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium text-center block"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// Notification Content Component
function NotificationContent({
  notification,
  getNotificationIcon,
}: {
  notification: Notification;
  getNotificationIcon: (type: Notification['type']) => string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900 text-sm line-clamp-2">{notification.title}</p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
          )}
        </div>
        <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-gray-400 text-xs mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
