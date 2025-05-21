import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Button, 
  IconButton,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Refresh, 
  FilterList, 
  DeleteSweep, 
  MarkEmailRead,
  Settings
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationItem from '../components/notifications/NotificationItem';
import { NotificationType } from '../types/notifications';

const NotificationsPage: React.FC = () => {
  const { 
    state, 
    fetchNotifications, 
    markAllAsRead,
    toggleNotificationSound,
  } = useNotifications();

  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');

  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    notificationSound 
  } = state;

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle filter menu
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterSelect = (type: NotificationType | 'all') => {
    setFilterType(type);
    handleFilterClose();
  };

  // Filter notifications based on tab and type filter
  const filteredNotifications = notifications.filter(notification => {
    // Filter by tab (All, Unread)
    if (tabValue === 1 && notification.isRead) {
      return false;
    }
    
    // Filter by notification type
    if (filterType !== 'all' && notification.type !== filterType) {
      return false;
    }
    
    return true;
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Notificações</Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie suas notificações e preferências de alertas
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
          >
            <Tab label="Todas" />
            <Tab 
              label={
                <>
                  Não lidas
                  {unreadCount > 0 && ` (${unreadCount})`}
                </>
              } 
            />
          </Tabs>
          
          <Box>
            <IconButton onClick={() => fetchNotifications()} title="Atualizar">
              <Refresh />
            </IconButton>
            
            <IconButton onClick={handleFilterClick} title="Filtrar">
              <FilterList />
            </IconButton>
            
            {unreadCount > 0 && (
              <IconButton onClick={markAllAsRead} title="Marcar tudo como lido">
                <MarkEmailRead />
              </IconButton>
            )}
          </Box>
          
          <Menu
            id="filter-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleFilterClose}
          >
            <MenuItem 
              onClick={() => handleFilterSelect('all')}
              selected={filterType === 'all'}
            >
              Todas
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => handleFilterSelect(NotificationType.INFO)}
              selected={filterType === NotificationType.INFO}
            >
              Informações
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect(NotificationType.SUCCESS)}
              selected={filterType === NotificationType.SUCCESS}
            >
              Sucessos
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect(NotificationType.WARNING)}
              selected={filterType === NotificationType.WARNING}
            >
              Avisos
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect(NotificationType.ERROR)}
              selected={filterType === NotificationType.ERROR}
            >
              Erros
            </MenuItem>
            <MenuItem 
              onClick={() => handleFilterSelect(NotificationType.REMINDER)}
              selected={filterType === NotificationType.REMINDER}
            >
              Lembretes
            </MenuItem>
          </Menu>
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSound}
                  onChange={(e) => toggleNotificationSound(e.target.checked)}
                />
              }
              label="Som de notificações"
            />
            
            <Button 
              variant="outlined" 
              startIcon={<Settings />}
              size="small"
              onClick={() => {/* Navigate to settings */}}
            >
              Configurações
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Display error if any */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchNotifications()}>
              Tentar novamente
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      <Paper>
        {isLoading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 4 
          }}>
            <CircularProgress />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 4
          }}>
            <Typography variant="h6" color="text.secondary">
              Nenhuma notificação encontrada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 1 ? 'Todas as notificações já foram lidas' : 'Não há notificações com os filtros selecionados'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {filteredNotifications.map(notification => (
              <React.Fragment key={notification.id}>
                <NotificationItem notification={notification} />
                <Divider />
              </React.Fragment>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
