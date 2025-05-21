// Types for Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  link?: string;
  category?: string;
  priority?: NotificationPriority;
  expiration?: Date;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  REMINDER = 'reminder'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface NotificationAction {
  label: string;
  action: string;
  icon?: string;
  color?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isNotificationDrawerOpen: boolean;
  showBadge: boolean;
  notificationSound: boolean;
}

// Types for API responses
export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  status: string;
  message?: string;
}

// Types for Notification Actions
export enum NotificationActionTypes {
  FETCH_NOTIFICATIONS_REQUEST = 'FETCH_NOTIFICATIONS_REQUEST',
  FETCH_NOTIFICATIONS_SUCCESS = 'FETCH_NOTIFICATIONS_SUCCESS',
  FETCH_NOTIFICATIONS_FAILURE = 'FETCH_NOTIFICATIONS_FAILURE',
  MARK_NOTIFICATION_READ = 'MARK_NOTIFICATION_READ',
  MARK_ALL_NOTIFICATIONS_READ = 'MARK_ALL_NOTIFICATIONS_READ',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
  TOGGLE_NOTIFICATION_DRAWER = 'TOGGLE_NOTIFICATION_DRAWER',
  TOGGLE_NOTIFICATION_BADGE = 'TOGGLE_NOTIFICATION_BADGE',
  TOGGLE_NOTIFICATION_SOUND = 'TOGGLE_NOTIFICATION_SOUND'
}
