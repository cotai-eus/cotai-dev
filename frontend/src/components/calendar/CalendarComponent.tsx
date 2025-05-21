import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Box, Paper, Typography, IconButton, Tooltip, useTheme } from '@mui/material';
import { 
  Today, 
  ViewWeek, 
  ViewDay, 
  ViewMonth, 
  ViewAgenda,
  ChevronLeft,
  ChevronRight,
  Add
} from '@mui/icons-material';

import { useCalendar } from '../../contexts/CalendarContext';
import { CalendarEvent, CalendarView } from '../../types/calendar';
import EventModal from './EventModal';
import CalendarToolbar from './CalendarToolbar';

// Setup the localizer for react-big-calendar
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// Create DnD calendar
const DnDCalendar = withDragAndDrop(Calendar);

const CalendarComponent: React.FC = () => {
  const { 
    state, 
    fetchEvents, 
    selectEvent, 
    toggleEventModal,
    changeView,
    navigateTo,
    moveEvent
  } = useCalendar();

  const { 
    events, 
    selectedEvent, 
    isModalOpen, 
    currentView, 
    currentDate,
    isLoading 
  } = state;

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    selectEvent(event);
  };

  // Handle event creation via slot selection (clicking on empty calendar space)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const newEvent: Omit<CalendarEvent, 'id'> = {
      title: '',
      start,
      end,
      allDay: false
    };
    
    selectEvent(newEvent as CalendarEvent);
    toggleEventModal(true);
  };

  // Handle event drag and drop
  const handleEventDrop = ({ event, start, end }: { event: CalendarEvent, start: Date, end: Date }) => {
    moveEvent(event.id, start, end);
  };

  // Handle event resizing
  const handleEventResize = ({ event, start, end }: { event: CalendarEvent, start: Date, end: Date }) => {
    moveEvent(event.id, start, end);
  };

  // Create a new event button handler
  const handleCreateEvent = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const newEvent: Omit<CalendarEvent, 'id'> = {
      title: '',
      start: now,
      end: oneHourLater,
      allDay: false
    };
    
    selectEvent(newEvent as CalendarEvent);
    toggleEventModal(true);
  };

  // Map between our view types and react-big-calendar view types
  const viewMap: Record<CalendarView, string> = {
    month: Views.MONTH,
    week: Views.WEEK,
    day: Views.DAY,
    agenda: Views.AGENDA
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Calendário</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigateTo(new Date())}>
              <Today />
            </IconButton>
            
            <IconButton 
              onClick={() => {
                const prevDate = new Date(currentDate);
                if (currentView === 'month') {
                  prevDate.setMonth(prevDate.getMonth() - 1);
                } else if (currentView === 'week') {
                  prevDate.setDate(prevDate.getDate() - 7);
                } else if (currentView === 'day') {
                  prevDate.setDate(prevDate.getDate() - 1);
                }
                navigateTo(prevDate);
              }}
            >
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="subtitle1" sx={{ mx: 2 }}>
              {moment(currentDate).format(
                currentView === 'month' 
                  ? 'MMMM YYYY' 
                  : currentView === 'week' 
                    ? '[Semana de] DD [de] MMMM'
                    : 'DD [de] MMMM YYYY'
              )}
            </Typography>
            
            <IconButton 
              onClick={() => {
                const nextDate = new Date(currentDate);
                if (currentView === 'month') {
                  nextDate.setMonth(nextDate.getMonth() + 1);
                } else if (currentView === 'week') {
                  nextDate.setDate(nextDate.getDate() + 7);
                } else if (currentView === 'day') {
                  nextDate.setDate(nextDate.getDate() + 1);
                }
                navigateTo(nextDate);
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>

          <Box>
            <Tooltip title="Visualização mensal">
              <IconButton 
                color={currentView === 'month' ? 'primary' : 'default'}
                onClick={() => changeView('month')}
              >
                <ViewMonth />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Visualização semanal">
              <IconButton 
                color={currentView === 'week' ? 'primary' : 'default'}
                onClick={() => changeView('week')}
              >
                <ViewWeek />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Visualização diária">
              <IconButton 
                color={currentView === 'day' ? 'primary' : 'default'}
                onClick={() => changeView('day')}
              >
                <ViewDay />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Visualização de agenda">
              <IconButton 
                color={currentView === 'agenda' ? 'primary' : 'default'}
                onClick={() => changeView('agenda')}
              >
                <ViewAgenda />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Criar novo evento">
              <IconButton 
                color="primary" 
                onClick={handleCreateEvent}
                sx={{ ml: 2 }}
              >
                <Add />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ flexGrow: 1, p: 2 }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 220px)' }} // Adjust based on your layout
          selectable
          resizable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          view={viewMap[currentView]}
          onView={(view) => changeView(view as CalendarView)}
          date={currentDate}
          onNavigate={(date) => navigateTo(date)}
          popup
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.backgroundColor || '#3174ad',
              borderColor: event.borderColor || '#2a6395',
              color: event.textColor || 'white'
            },
            className: 'calendar-event',
            'aria-label': `Event: ${event.title}, Start: ${event.start.toLocaleString()}, End: ${event.end.toLocaleString()}`
          })}
          components={{
            toolbar: () => null, // We use our custom toolbar above
            event: ({ event, title }) => (
              <div 
                tabIndex={0} 
                role="button" 
                aria-label={`Event: ${event.title}, Start: ${event.start.toLocaleString()}, End: ${event.end.toLocaleString()}`}
                style={{ height: '100%' }}
                onKeyDown={(e) => {
                  // Handle keyboard events for accessibility
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectEvent(event);
                  }
                }}
              >
                <div>{title}</div>
                {event.location && <div><small>{event.location}</small></div>}
              </div>
            )
          }}
          draggableAccessor={(event) => event.draggable !== false} // All events draggable by default
          resizableAccessor={(event) => true} // All events resizable
          tabIndex={0} // Make the calendar focusable
        />
      </Paper>

      <EventModal
        open={isModalOpen}
        onClose={() => toggleEventModal(false)}
        event={selectedEvent}
      />
    </Box>
  );
};

export default CalendarComponent;
