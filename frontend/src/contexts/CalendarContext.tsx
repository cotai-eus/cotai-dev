import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CalendarEvent, CalendarState, CalendarView } from '../types/calendar';
import EventService from '../services/events';

interface CalendarContextProps {
  state: CalendarState;
  fetchEvents: (startDate?: Date, endDate?: Date) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  selectEvent: (event: CalendarEvent | null) => void;
  toggleEventModal: (open?: boolean) => void;
  changeView: (view: CalendarView) => void;
  navigateTo: (date: Date) => void;
  moveEvent: (id: string, start: Date, end: Date) => Promise<void>;
}

export const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const [state, setState] = useState<CalendarState>({
    events: [],
    selectedEvent: null,
    isModalOpen: false,
    currentView: 'month',
    currentDate: new Date(),
    isLoading: false,
    error: null,
  });

  const fetchEvents = async (startDate?: Date, endDate?: Date) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await EventService.getAllEvents(startDate, endDate);
      setState(prev => ({ 
        ...prev, 
        events: response.events,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch events' 
      }));
    }
  };

  const createEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const newEvent = await EventService.createEvent(event);
      setState(prev => ({ 
        ...prev, 
        events: [...prev.events, newEvent],
        isLoading: false,
        isModalOpen: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to create event' 
      }));
    }
  };

  const updateEvent = async (id: string, event: Partial<CalendarEvent>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updatedEvent = await EventService.updateEvent(id, event);
      setState(prev => ({ 
        ...prev, 
        events: prev.events.map(e => e.id === id ? { ...e, ...updatedEvent } : e),
        isLoading: false,
        isModalOpen: false,
        selectedEvent: null
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to update event' 
      }));
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await EventService.deleteEvent(id);
      setState(prev => ({ 
        ...prev, 
        events: prev.events.filter(e => e.id !== id),
        isLoading: false,
        isModalOpen: false,
        selectedEvent: null
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to delete event' 
      }));
    }
  };

  const selectEvent = (event: CalendarEvent | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedEvent: event,
      isModalOpen: event !== null
    }));
  };

  const toggleEventModal = (open?: boolean) => {
    setState(prev => ({ 
      ...prev, 
      isModalOpen: open ?? !prev.isModalOpen,
      selectedEvent: open === false ? null : prev.selectedEvent
    }));
  };

  const changeView = (view: CalendarView) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  const navigateTo = (date: Date) => {
    setState(prev => ({ ...prev, currentDate: date }));
  };

  const moveEvent = async (id: string, start: Date, end: Date) => {
    try {
      const event = state.events.find(e => e.id === id);
      if (!event) return;
      
      setState(prev => ({
        ...prev,
        events: prev.events.map(e => 
          e.id === id ? { ...e, start, end } : e
        )
      }));
      
      await EventService.updateEvent(id, { start, end });
    } catch (error) {
      // Revert to original state on error
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to move event',
      }));
      
      // Re-fetch events to ensure UI is in sync with backend
      fetchEvents();
    }
  };

  // Load initial events
  useEffect(() => {
    fetchEvents();
  }, []);

  const value = {
    state,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    selectEvent,
    toggleEventModal,
    changeView,
    navigateTo,
    moveEvent
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
