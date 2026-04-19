import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { getSocket } from '../../services/socket';
import type { RootState } from '../../store/store';
import { markReadLocal, prepend, setAll, setLoading, setUnreadCount } from '../../store/slices/inboxSlice';

const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const { items: notifications, unreadCount, loading } = useSelector((state: RootState) => state.inbox);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadNotifications();
    const cleanup = setupSocketNotifications();
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      dispatch(setLoading(true));
      const data = await notificationAPI.list({ limit: 20, unreadOnly: false });
      dispatch(setAll({ notifications: data.notifications || [], unreadCount: data.unreadCount || 0 }));
    } catch (error) {
      console.error('Failed to load notifications:', error);
      dispatch(setLoading(false));
    } finally {
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      loadNotifications();
    }, 500);
  };

  const setupSocketNotifications = () => {
    const socket = getSocket();
    if (!socket) return;

    const onNewNotification = (data: any) => {
      // If backend emits full Notification docs, prepend it.
      if (data && data._id) {
        dispatch(prepend(data));
      }
      scheduleRefresh();
    };

    // Fallback refresh only (source of truth is `new_notification` + /api/notifications)
    const onFallbackEvent = () => {
      scheduleRefresh();
    };

    socket.on('new_notification', onNewNotification);
    socket.on('booking:new_request', onFallbackEvent);
    socket.on('booking:status_update', onFallbackEvent);
    socket.on('new_message', onFallbackEvent);
    socket.on('receive_message', onFallbackEvent);
    socket.on('incoming_call', onFallbackEvent);
    socket.on('new_request', onFallbackEvent);
    socket.on('request_status_update', onFallbackEvent);
    socket.on('connect', onFallbackEvent);

    return () => {
      socket.off('new_notification', onNewNotification);
      socket.off('booking:new_request', onFallbackEvent);
      socket.off('booking:status_update', onFallbackEvent);
      socket.off('new_message', onFallbackEvent);
      socket.off('receive_message', onFallbackEvent);
      socket.off('incoming_call', onFallbackEvent);
      socket.off('new_request', onFallbackEvent);
      socket.off('request_status_update', onFallbackEvent);
      socket.off('connect', onFallbackEvent);
    };
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      if (notificationId.startsWith('local-')) {
        dispatch(markReadLocal(notificationId));
        return;
      }
      const res = await notificationAPI.markSingleAsRead(notificationId);
      dispatch(markReadLocal(notificationId));
      dispatch(setUnreadCount(res.unreadCount ?? 0));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationAPI.markAsRead();
      // Local fast path: mark everything read; then sync unreadCount from backend
      notifications.forEach((n) => {
        if (!n.isRead) {
          dispatch(markReadLocal(n._id));
        }
      });
      dispatch(setUnreadCount(res.unreadCount ?? 0));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_created':
      case 'new_booking_request':
      case 'booking_accepted':
      case 'booking_rejected':
        return '🚗';
      case 'new_request':
      case 'request_accepted':
      case 'request_rejected':
        return '📩';
      case 'new_message':
        return '💬';
      case 'incoming_call':
        return '📞';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-white text-sm hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-slate-500">
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notification.isRead ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-800 text-sm">{notification.title}</h4>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => {
                  // Navigate to full notifications page
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All Notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
