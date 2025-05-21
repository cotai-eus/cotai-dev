import api from './api';
import { Notification, NotificationsResponse } from '../types/notifications';
import { io, Socket } from 'socket.io-client';
import { mockNotifications } from '../utils/mockData';

const BASE_URL = '/notifications';
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || import.meta.env.VITE_USE_MOCK_DATA === 'true';
let socket: Socket | null = null;

// Initialize WebSockets connection
const initializeWebSocket = (token: string, onNewNotification: (notification: Notification) => void) => {
  // If using mock data, set up a simulated websocket that sends mock notifications
  if (USE_MOCK_DATA) {
    console.log('Using mock WebSocket for notifications');
    
    // Simulate occasional notifications with a timer
    const mockNotificationInterval = setInterval(() => {
      const mockTypes = [
        'info', 'success', 'warning', 'error', 'reminder'
      ];
      
      // Random notification types
      const type = mockTypes[Math.floor(Math.random() * mockTypes.length)] as any;
      
      const mockNotification: Notification = {
        id: `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `Mock ${type} notification`,
        message: `This is a simulated ${type} notification from the mock WebSocket.`,
        type,
        isRead: false,
        createdAt: new Date(),
        category: 'system'
      };
      
      onNewNotification(mockNotification);
    }, 300000); // Send a notification every 5 minutes
    
    return () => clearInterval(mockNotificationInterval);
  }
  
  // Real WebSocket implementation for production
  const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8000';
  
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(socketUrl, {
    auth: {
      token
    },
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('Connected to notification service');
  });
  
  socket.on('notification', (data: Notification) => {
    onNewNotification(data);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from notification service');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
  
  return () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };
};

export const NotificationService = {
  initializeWebSocket,
  
  getAllNotifications: async (): Promise<NotificationsResponse> => {
    if (USE_MOCK_DATA) {
      console.log('Using mock notification data');
      const unreadCount = mockNotifications.filter(n => !n.isRead).length;
      
      return {
        notifications: [...mockNotifications],
        unreadCount,
        status: 'success'
      };
    }
    
    try {
      const response = await api.get(BASE_URL);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch notifications');
    }
  },
  
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    if (USE_MOCK_DATA) {
      const unreadCount = mockNotifications.filter(n => !n.isRead).length;
      return { unreadCount };
    }
    
    try {
      const response = await api.get(`${BASE_URL}/unread/count`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch unread count');
    }
  },
  
  markAsRead: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      const index = mockNotifications.findIndex(n => n.id === id);
      if (index !== -1) {
        mockNotifications[index] = { ...mockNotifications[index], isRead: true };
        return;
      }
      throw new Error(`Notification with id ${id} not found`);
    }
    
    try {
      await api.put(`${BASE_URL}/${id}/read`);
    } catch (error) {
      throw new Error(`Failed to mark notification ${id} as read`);
    }
  },
  
  markAllAsRead: async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      mockNotifications.forEach(notification => {
        notification.isRead = true;
      });
      return;
    }
    
    try {
      await api.put(`${BASE_URL}/read-all`);
    } catch (error) {
      throw new Error('Failed to mark all notifications as read');
    }
  },
  
  deleteNotification: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      const index = mockNotifications.findIndex(n => n.id === id);
      if (index !== -1) {
        mockNotifications.splice(index, 1);
        return;
      }
      throw new Error(`Notification with id ${id} not found`);
    }
    
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete notification ${id}`);
    }
  }
};

export default NotificationService;
