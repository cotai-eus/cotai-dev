import React from 'react';
import { Box, Button, Toolbar, Typography, IconButton } from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight, 
  Today,
  ViewDay,
  ViewWeek,
  ViewMonth,
  ViewAgenda,
  Add
} from '@mui/icons-material';
import { CalendarView } from '../../types/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarToolbarProps {
  date: Date;
  view: CalendarView;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: CalendarView) => void;
  onAddEvent: () => void;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  date,
  view,
  onNavigate,
  onView,
  onAddEvent
}) => {
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    onNavigate(action);
  };

  const changeView = (newView: CalendarView) => {
    onView(newView);
  };

  const viewButtons = [
    { view: 'month' as CalendarView, icon: <ViewMonth />, label: 'Mês' },
    { view: 'week' as CalendarView, icon: <ViewWeek />, label: 'Semana' },
    { view: 'day' as CalendarView, icon: <ViewDay />, label: 'Dia' },
    { view: 'agenda' as CalendarView, icon: <ViewAgenda />, label: 'Agenda' }
  ];

  const getTitle = () => {
    switch (view) {
      case 'month':
        return format(date, 'MMMM yyyy', { locale: ptBR });
      case 'week':
        return `Semana de ${format(date, 'd MMM', { locale: ptBR })}`;
      case 'day':
        return format(date, 'dd MMMM yyyy', { locale: ptBR });
      case 'agenda':
        return 'Agenda';
      default:
        return '';
    }
  };

  return (
    <Toolbar sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      flexWrap: 'wrap',
      px: 2,
      py: 1
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('TODAY')}
          startIcon={<Today />}
          sx={{ mr: 1 }}
          size="small"
        >
          Hoje
        </Button>

        <IconButton onClick={() => navigate('PREV')} size="small">
          <ChevronLeft />
        </IconButton>

        <Typography variant="h6" sx={{ mx: 2, fontWeight: 500 }}>
          {getTitle()}
        </Typography>

        <IconButton onClick={() => navigate('NEXT')} size="small">
          <ChevronRight />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', mr: 2 }}>
          {viewButtons.map((btn) => (
            <Button
              key={btn.view}
              color={view === btn.view ? 'primary' : 'inherit'}
              variant={view === btn.view ? 'contained' : 'text'}
              onClick={() => changeView(btn.view)}
              startIcon={btn.icon}
              size="small"
              sx={{ mx: 0.5 }}
            >
              {btn.label}
            </Button>
          ))}
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={onAddEvent}
          size="small"
        >
          Evento
        </Button>
      </Box>
    </Toolbar>
  );
};

export default CalendarToolbar;
