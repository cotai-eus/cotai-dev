import React from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  SelectChangeEvent
} from '@mui/material';
import { Close, Delete, LocationOn, Description, Category } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

import { CalendarEvent } from '../../types/calendar';
import { useCalendar } from '../../contexts/CalendarContext';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

// Event categories with colors
const eventCategories = [
  { value: 'meeting', label: 'Reunião', color: '#1976d2' },
  { value: 'deadline', label: 'Prazo', color: '#d32f2f' },
  { value: 'task', label: 'Tarefa', color: '#388e3c' },
  { value: 'reminder', label: 'Lembrete', color: '#f57c00' },
  { value: 'appointment', label: 'Compromisso', color: '#7b1fa2' },
  { value: 'other', label: 'Outro', color: '#607d8b' },
];

const EventModal: React.FC<EventModalProps> = ({ open, onClose, event }) => {
  const { createEvent, updateEvent, deleteEvent } = useCalendar();

  const [formState, setFormState] = React.useState<CalendarEvent>({
    id: '',
    title: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    allDay: false,
    description: '',
    location: '',
    category: 'meeting',
    backgroundColor: '#1976d2',
  });

  // Update form state when event prop changes
  React.useEffect(() => {
    if (event) {
      setFormState({
        ...event,
        // Ensure these properties exist
        description: event.description || '',
        location: event.location || '',
        category: event.category || 'meeting',
        backgroundColor: event.backgroundColor || getColorForCategory(event.category || 'meeting'),
      });
    } else {
      // Reset form for new events
      setFormState({
        id: '',
        title: '',
        start: new Date(),
        end: new Date(new Date().getTime() + 60 * 60 * 1000),
        allDay: false,
        description: '',
        location: '',
        category: 'meeting',
        backgroundColor: '#1976d2',
      });
    }
  }, [event]);

  const getColorForCategory = (category: string): string => {
    const found = eventCategories.find(cat => cat.value === category);
    return found ? found.color : '#1976d2';
  };

  const handleFieldChange = (field: keyof CalendarEvent, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));

    // Update color when category changes
    if (field === 'category') {
      setFormState(prev => ({
        ...prev,
        backgroundColor: getColorForCategory(value as string)
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formState.title.trim()) {
      // Show error for empty title
      return;
    }

    if (event && event.id) {
      // Update existing event
      await updateEvent(event.id, {
        ...formState,
        title: formState.title.trim()
      });
    } else {
      // Create new event
      const { id, ...newEvent } = formState;
      await createEvent({
        ...newEvent,
        title: formState.title.trim()
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (event && event.id) {
      await deleteEvent(event.id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {event && event.id ? 'Editar Evento' : 'Novo Evento'}
        </Typography>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Título do evento"
              value={formState.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              margin="normal"
              placeholder="Digite o título do evento"
              autoFocus
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DateTimePicker
                label="Data e hora de início"
                value={formState.start}
                onChange={(value) => handleFieldChange('start', value || new Date())}
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                disabled={formState.allDay}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DateTimePicker
                label="Data e hora de término"
                value={formState.end}
                onChange={(value) => handleFieldChange('end', value || new Date())}
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                disabled={formState.allDay}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formState.allDay}
                  onChange={(e) => handleFieldChange('allDay', e.target.checked)}
                />
              }
              label="Evento de dia inteiro"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <LocationOn sx={{ color: 'action.active', mt: 2.5, mr: 1 }} />
              <TextField
                fullWidth
                label="Local"
                value={formState.location || ''}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                margin="normal"
                placeholder="Local do evento"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Category sx={{ color: 'action.active', mt: 2.5, mr: 1 }} />
              <FormControl fullWidth margin="normal">
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formState.category || 'meeting'}
                  label="Categoria"
                  onChange={(e: SelectChangeEvent) => handleFieldChange('category', e.target.value)}
                >
                  {eventCategories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            borderRadius: '50%', 
                            bgcolor: category.color, 
                            mr: 1 
                          }} 
                        />
                        {category.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Description sx={{ color: 'action.active', mt: 2.5, mr: 1 }} />
              <TextField
                fullWidth
                label="Descrição"
                value={formState.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                margin="normal"
                placeholder="Descreva os detalhes do evento"
                multiline
                rows={3}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box>
          {event && event.id && (
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              startIcon={<Delete />}
            >
              Excluir
            </Button>
          )}
        </Box>
        <Box>
          <Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {event && event.id ? 'Atualizar' : 'Criar'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
