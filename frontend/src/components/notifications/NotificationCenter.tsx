import React, { useEffect, useRef } from 'react';
import { 
  Box, 
  Badge, 
  IconButton, 
  Tooltip, 
  Drawer, 
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Stack,
  Divider,
  Fade,
  CircularProgress
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  MarkEmailRead,
  DeleteSweep,
  Close,
  Info,
  Warning,
  CheckCircle,
  Error,
  NotificationsActive,
  ArrowForward,
  Settings
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// Import context and types
import { useNotifications } from '../../contexts/NotificationContext';
import { Notification, NotificationType } from '../../types/notifications';
import NotificationItem from './NotificationItem';

const NotificationCenter: React.FC = () => {
  const {
    state,
    fetchNotifications,
    markAllAsRead,
    toggleNotificationDrawer
  } = useNotifications();

  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    isNotificationDrawerOpen,
    showBadge
  } = state;

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle closing drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isNotificationDrawerOpen && 
          drawerRef.current && 
          !drawerRef.current.contains(event.target as Node)) {
        toggleNotificationDrawer(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationDrawerOpen, toggleNotificationDrawer]);

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      'today': [],
      'yesterday': [],
      'older': []
    };

    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);

      if (isToday(date)) {
        groups['today'].push(notification);
      } else if (isYesterday(date)) {
        groups['yesterday'].push(notification);
      } else {
        groups['older'].push(notification);
      }
    });

    return groups;
  }, [notifications]);

  return (
    <>
      {/* Notification Bell Icon with Badge */}
      <Tooltip title="Notificações">
        <IconButton 
          color="inherit"
          onClick={() => toggleNotificationDrawer(true)}
        >
          <Badge 
            badgeContent={showBadge ? unreadCount : 0} 
            color="error" 
            invisible={unreadCount === 0}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Notification Drawer */}
      <Drawer
        anchor="right"
        open={isNotificationDrawerOpen}
        onClose={() => toggleNotificationDrawer(false)}
        PaperProps={{
          sx: { 
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%'
          }
        }}
      >
        <Box 
          ref={drawerRef} 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="h6" component="div">
              Notificações
              {unreadCount > 0 && (
                <Badge 
                  badgeContent={unreadCount} 
                  color="error" 
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

            <Box>
              {unreadCount > 0 && (
                <Tooltip title="Marcar tudo como lido">
                  <IconButton 
                    size="small" 
                    onClick={markAllAsRead}
                    sx={{ mr: 1 }}
                  >
                    <MarkEmailRead />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Configurações de notificações">
                <IconButton 
                  size="small" 
                  onClick={() => {
                    toggleNotificationDrawer(false);
                    navigate('/settings/notifications');
                  }}
                  sx={{ mr: 1 }}
                >
                  <Settings />
                </IconButton>
              </Tooltip>

              <IconButton 
                size="small" 
                onClick={() => toggleNotificationDrawer(false)}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Notification List */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            p: 0
          }}>
            {isLoading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}>
                <CircularProgress />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                p: 3
              }}>
                <NotificationsIcon 
                  sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} 
                />
                <Typography variant="h6" color="text.secondary">
                  Nenhuma notificação
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Você será notificado sobre eventos importantes aqui
                </Typography>
              </Box>
            ) : (
              <>
                {/* Today's notifications */}
                {groupedNotifications.today.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ px: 2, py: 1, bgcolor: 'background.default' }}
                    >
                      Hoje
                    </Typography>
                    {groupedNotifications.today.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                      />
                    ))}
                  </Box>
                )}

                {/* Yesterday's notifications */}
                {groupedNotifications.yesterday.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ px: 2, py: 1, bgcolor: 'background.default' }}
                    >
                      Ontem
                    </Typography>
                    {groupedNotifications.yesterday.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                      />
                    ))}
                  </Box>
                )}

                {/* Older notifications */}
                {groupedNotifications.older.length > 0 && (
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ px: 2, py: 1, bgcolor: 'background.default' }}
                    >
                      Anteriores
                    </Typography>
                    {groupedNotifications.older.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                      />
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Footer */}
          {notifications.length > 0 && (
            <Box sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Button 
                variant="text" 
                endIcon={<ArrowForward />}
                onClick={() => {
                  toggleNotificationDrawer(false);
                  navigate('/notifications');
                }}
              >
                Ver todas as notificações
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default NotificationCenter;
