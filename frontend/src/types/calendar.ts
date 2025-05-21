// Types for Calendar and Events
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  category?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  draggable?: boolean;
}

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarState {
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  isModalOpen: boolean;
  currentView: CalendarView;
  currentDate: Date;
  isLoading: boolean;
  error: string | null;
}

// Types for API responses
export interface EventsResponse {
  events: CalendarEvent[];
  status: string;
  message?: string;
}

// Types for Event Actions
export enum EventActionTypes {
  FETCH_EVENTS_REQUEST = 'FETCH_EVENTS_REQUEST',
  FETCH_EVENTS_SUCCESS = 'FETCH_EVENTS_SUCCESS',
  FETCH_EVENTS_FAILURE = 'FETCH_EVENTS_FAILURE',
  CREATE_EVENT = 'CREATE_EVENT',
  UPDATE_EVENT = 'UPDATE_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  SELECT_EVENT = 'SELECT_EVENT',
  CLEAR_SELECTED_EVENT = 'CLEAR_SELECTED_EVENT',
  TOGGLE_EVENT_MODAL = 'TOGGLE_EVENT_MODAL',
  CHANGE_VIEW = 'CHANGE_VIEW',
  NAVIGATE_DATE = 'NAVIGATE_DATE'
}
