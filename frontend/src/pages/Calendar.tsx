import React, { useState } from 'react';
import { Container, Box, Paper, Typography } from '@mui/material';
import CalendarComponent from '../components/calendar/CalendarComponent';
import { CalendarProvider } from '../contexts/CalendarContext';

const Calendar: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Calendário</Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie seus compromissos, prazos de licitações e eventos importantes
        </Typography>
      </Box>
      
      <CalendarProvider>
        <CalendarComponent />
      </CalendarProvider>
    </Container>
  );
};

export default Calendar;
