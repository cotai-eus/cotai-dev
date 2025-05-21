import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Notification, 
  NotificationState, 
  NotificationType,
  NotificationPriority
} from '../types/notifications';
import NotificationService from '../services/notifications';

// Sound files for different notification types
const notificationSounds = {
  [NotificationType.INFO]: new Audio('/assets/sounds/notification-info.mp3'),
  [NotificationType.SUCCESS]: new Audio('/assets/sounds/notification-success.mp3'),
  [NotificationType.WARNING]: new Audio('/assets/sounds/notification-warning.mp3'),
  [NotificationType.ERROR]: new Audio('/assets/sounds/notification-error.mp3'),
  [NotificationType.REMINDER]: new Audio('/assets/sounds/notification-reminder.mp3'),
  default: new Audio('/assets/sounds/notification.mp3')
};

interface NotificationContextProps {
  state: NotificationState;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  toggleNotificationDrawer: (open?: boolean) => void;
  toggleNotificationBadge: (show?: boolean) => void;
  toggleNotificationSound: (enabled?: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    isNotificationDrawerOpen: false,
    showBadge: true,
    notificationSound: true
  });

  const fetchNotifications = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await NotificationService.getAllNotifications();
      setState(prev => ({ 
        ...prev, 
        notifications: response.notifications,
        unreadCount: response.unreadCount,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch notifications' 
      }));
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setState(prev => ({ 
        ...prev, 
        notifications: prev.notifications.map(
          n => n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to mark notification as read' 
      }));
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setState(prev => ({ 
        ...prev, 
        notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' 
      }));
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await NotificationService.deleteNotification(id);
      const notification = state.notifications.find(n => n.id === id);
      setState(prev => ({ 
        ...prev, 
        notifications: prev.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.isRead 
          ? Math.max(0, prev.unreadCount - 1) 
          : prev.unreadCount
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete notification' 
      }));
    }
  };

  const toggleNotificationDrawer = (open?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      isNotificationDrawerOpen: open ?? !prev.isNotificationDrawerOpen 
    }));
  };

  const toggleNotificationBadge = (show?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      showBadge: show ?? !prev.showBadge 
    }));
  };

  const toggleNotificationSound = (enabled?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      notificationSound: enabled ?? !prev.notificationSound 
    }));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date()
    };

    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications],
      unreadCount: prev.unreadCount + 1
    }));

    // Play sound if enabled
    if (state.notificationSound) {
      try {
        // Choose sound based on notification type
        const sound = notificationSounds[notification.type] || notificationSounds.default;
        sound.play();
      } catch (error) {
        console.error('Failed to play notification sound:', error);
      }
    }
  };

  const removeNotification = (id: string) => {
    const notification = state.notifications.find(n => n.id === id);
    
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id),
      unreadCount: notification && !notification.isRead 
        ? Math.max(0, prev.unreadCount - 1) 
        : prev.unreadCount
    }));
  };

  // Handle WebSocket notifications
  const handleNewNotification = useCallback((notification: Notification) => {
    addNotification(notification);
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Initialize WebSocket connection
    const token = localStorage.getItem('token');
    if (token) {
      const cleanup = NotificationService.initializeWebSocket(token, handleNewNotification);
      return cleanup;
    }
  }, [handleNewNotification]);

  const value = {
    state,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleNotificationDrawer,
    toggleNotificationBadge,
    toggleNotificationSound,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
