import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarProvider } from '../../contexts/CalendarContext';
import CalendarComponent from '../../components/calendar/CalendarComponent';
import { mockEvents } from '../../utils/mockData';

// Mock the Calendar context
jest.mock('../../contexts/CalendarContext', () => ({
  useCalendar: () => ({
    state: {
      events: mockEvents,
      selectedEvent: null,
      isModalOpen: false,
      currentView: 'month',
      currentDate: new Date('2025-05-21'),
      isLoading: false,
      error: null
    },
    fetchEvents: jest.fn(),
    selectEvent: jest.fn(),
    toggleEventModal: jest.fn(),
    changeView: jest.fn(),
    navigateTo: jest.fn(),
    moveEvent: jest.fn()
  }),
  CalendarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('CalendarComponent', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();
  });

  test('renders the calendar component', () => {
    render(
      <CalendarProvider>
        <CalendarComponent />
      </CalendarProvider>
    );
    
    // Check if calendar header is rendered
    expect(screen.getByText('Calendário')).toBeInTheDocument();
  });

  test('changes view when clicking view buttons', () => {
    const { changeView } = require('../../contexts/CalendarContext').useCalendar();
    
    render(
      <CalendarProvider>
        <CalendarComponent />
      </CalendarProvider>
    );
    
    // Find view buttons and click them
    fireEvent.click(screen.getByLabelText('Visualização semanal'));
    expect(changeView).toHaveBeenCalledWith('week');
    
    fireEvent.click(screen.getByLabelText('Visualização diária'));
    expect(changeView).toHaveBeenCalledWith('day');
    
    fireEvent.click(screen.getByLabelText('Visualização de agenda'));
    expect(changeView).toHaveBeenCalledWith('agenda');
    
    fireEvent.click(screen.getByLabelText('Visualização mensal'));
    expect(changeView).toHaveBeenCalledWith('month');
  });

  test('opens create event modal when clicking the add button', () => {
    const { toggleEventModal } = require('../../contexts/CalendarContext').useCalendar();
    
    render(
      <CalendarProvider>
        <CalendarComponent />
      </CalendarProvider>
    );
    
    fireEvent.click(screen.getByLabelText('Criar novo evento'));
    expect(toggleEventModal).toHaveBeenCalledWith(true);
  });

  // Add more tests as needed for drag and drop, event selection, etc.
});
