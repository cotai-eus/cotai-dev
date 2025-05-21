import api from './api';
import { CalendarEvent, EventsResponse } from '../types/calendar';
import { mockEvents } from '../utils/mockData';

const BASE_URL = '/events';
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const EventService = {
  getAllEvents: async (startDate?: Date, endDate?: Date): Promise<EventsResponse> => {
    // Use mock data if in development or if explicitly configured
    if (USE_MOCK_DATA) {
      console.log('Using mock event data');
      
      // Filter events if date range is provided
      let filteredEvents = [...mockEvents];
      if (startDate && endDate) {
        filteredEvents = mockEvents.filter(event => 
          (new Date(event.start) >= new Date(startDate) && 
           new Date(event.start) <= new Date(endDate)) ||
          (new Date(event.end) >= new Date(startDate) && 
           new Date(event.end) <= new Date(endDate))
        );
      }
      
      return {
        events: filteredEvents,
        status: 'success'
      };
    }
    
    // Use real API
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString());
      if (endDate) params.append('end_date', endDate.toISOString());
      
      const response = await api.get(`${BASE_URL}?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch events');
    }
  },
  
  getEventById: async (id: string): Promise<CalendarEvent> => {
    if (USE_MOCK_DATA) {
      const event = mockEvents.find(e => e.id === id);
      if (event) {
        return event;
      }
      throw new Error(`Event with id ${id} not found`);
    }
    
    try {
      const response = await api.get(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch event with id: ${id}`);
    }
  },
  
  createEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    if (USE_MOCK_DATA) {
      // Generate new event with UUID
      const newEvent: CalendarEvent = {
        ...event,
        id: `event-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      mockEvents.push(newEvent);
      return newEvent;
    }
    
    try {
      const response = await api.post(BASE_URL, event);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create event');
    }
  },
  
  updateEvent: async (id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    if (USE_MOCK_DATA) {
      const index = mockEvents.findIndex(e => e.id === id);
      if (index !== -1) {
        mockEvents[index] = { ...mockEvents[index], ...event };
        return mockEvents[index];
      }
      throw new Error(`Event with id ${id} not found`);
    }
    
    try {
      const response = await api.put(`${BASE_URL}/${id}`, event);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update event with id: ${id}`);
    }
  },
  
  deleteEvent: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      const index = mockEvents.findIndex(e => e.id === id);
      if (index !== -1) {
        mockEvents.splice(index, 1);
        return;
      }
      throw new Error(`Event with id ${id} not found`);
    }
    
    try {
      await api.delete(`${BASE_URL}/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete event with id: ${id}`);
    }
  }
};

export default EventService;
