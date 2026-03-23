import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeNotification } from '../../store/slices/notificationSlice';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast: React.FC = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notification.notifications);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    notifications.forEach((notification) => {
      if (notification.duration) {
        timers.push(
          setTimeout(() => {
            dispatch(removeNotification(notification.id));
          }, notification.duration)
        );
      }
    });
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  return (
    <div className="fixed top-20 right-4 z-[200] space-y-2 pointer-events-auto">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`max-w-sm w-full p-4 rounded-lg border shadow-lg ${getBgColor(notification.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${getTextColor(notification.type)}`}>
                  {notification.title}
                </p>
                <p className={`text-sm mt-1 ${getTextColor(notification.type)} opacity-90`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => dispatch(removeNotification(notification.id))}
                className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast; 