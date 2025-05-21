import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, addHours, subHours, startOfDay } from 'date-fns';
import { CalendarEvent } from '../types/calendar';
import { Notification, NotificationType, NotificationPriority } from '../types/notifications';

// Create a reference to today's date
const today = new Date();
const startOfToday = startOfDay(today);

// Mock Calendar Events
export const mockEvents: CalendarEvent[] = [
  {
    id: uuidv4(),
    title: 'Executive Meeting',
    start: addHours(startOfToday, 10),
    end: addHours(startOfToday, 12),
    allDay: false,
    description: 'Quarterly review of company performance.',
    location: 'Conference Room A',
    category: 'meeting',
    backgroundColor: '#1976d2',
    draggable: true
  },
  {
    id: uuidv4(),
    title: 'Product Demo',
    start: addHours(addDays(startOfToday, 1), 14),
    end: addHours(addDays(startOfToday, 1), 16),
    allDay: false,
    description: 'Demo of new product features to the client.',
    location: 'Meeting Room B',
    category: 'demo',
    backgroundColor: '#2e7d32',
    draggable: true
  },
  {
    id: uuidv4(),
    title: 'Team Building',
    start: addDays(startOfToday, 3),
    end: addDays(startOfToday, 4),
    allDay: true,
    description: 'Annual team building retreat.',
    location: 'Mountain Resort',
    category: 'event',
    backgroundColor: '#ed6c02',
    draggable: true
  },
  {
    id: uuidv4(),
    title: 'Project Deadline',
    start: addHours(addDays(startOfToday, 5), 9),
    end: addHours(addDays(startOfToday, 5), 17),
    allDay: false,
    description: 'Final deadline for the current project phase.',
    category: 'deadline',
    backgroundColor: '#d32f2f',
    draggable: true
  },
  {
    id: uuidv4(),
    title: 'Training Session',
    start: addHours(subDays(startOfToday, 2), 13),
    end: addHours(subDays(startOfToday, 2), 17),
    allDay: false,
    description: 'New technology training for the development team.',
    location: 'Training Center',
    category: 'training',
    backgroundColor: '#7b1fa2',
    draggable: true
  }
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: uuidv4(),
    title: 'New Message',
    message: 'You have received a new message from Maria Santos.',
    type: NotificationType.INFO,
    isRead: false,
    createdAt: subHours(today, 1),
    link: '/messages/123',
    category: 'message'
  },
  {
    id: uuidv4(),
    title: 'Document Uploaded',
    message: 'Your document "Q1 Report.pdf" has been successfully uploaded.',
    type: NotificationType.SUCCESS,
    isRead: false,
    createdAt: subHours(today, 3),
    link: '/documents/456',
    category: 'document'
  },
  {
    id: uuidv4(),
    title: 'Meeting Reminder',
    message: 'Your meeting with the Executive Team starts in 30 minutes.',
    type: NotificationType.REMINDER,
    isRead: false,
    createdAt: subHours(today, 5),
    priority: NotificationPriority.HIGH,
    link: '/calendar/789',
    category: 'calendar'
  },
  {
    id: uuidv4(),
    title: 'Storage Limit Warning',
    message: 'Your storage is at 90% capacity. Please consider upgrading or removing old files.',
    type: NotificationType.WARNING,
    isRead: true,
    createdAt: subDays(today, 1),
    category: 'system'
  },
  {
    id: uuidv4(),
    title: 'Failed Login Attempt',
    message: 'There was a failed login attempt to your account from an unknown location.',
    type: NotificationType.ERROR,
    isRead: true,
    createdAt: subDays(today, 2),
    priority: NotificationPriority.HIGH,
    category: 'security'
  },
  {
    id: uuidv4(),
    title: 'System Maintenance',
    message: 'Scheduled system maintenance on May 25, 2025. The system may be down for 2 hours.',
    type: NotificationType.INFO,
    isRead: true,
    createdAt: subDays(today, 3),
    category: 'system'
  }
];
