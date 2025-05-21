import React from 'react';
import { 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemButton,
  Typography, 
  IconButton, 
  Box,
  Tooltip,
  ButtonBase
} from '@mui/material';
import { 
  Info, 
  Warning, 
  CheckCircle, 
  Error, 
  Alarm,
  Delete,
  MarkEmailRead
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { Notification, NotificationType } from '../../types/notifications';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.INFO:
        return <Info color="info" />;
      case NotificationType.SUCCESS:
        return <CheckCircle color="success" />;
      case NotificationType.WARNING:
        return <Warning color="warning" />;
      case NotificationType.ERROR:
        return <Error color="error" />;
      case NotificationType.REMINDER:
        return <Alarm color="primary" />;
      default:
        return <Info color="info" />;
    }
  };

  // Format the time
  const getFormattedTime = () => {
    const date = new Date(notification.createdAt);
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: ptBR
    });
  };

  // Handle click on notification
  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Box>
          {!notification.isRead && (
            <Tooltip title="Marcar como lido">
              <IconButton 
                edge="end" 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}
              >
                <MarkEmailRead fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Excluir">
            <IconButton 
              edge="end" 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
      sx={{ 
        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
        '&:hover': {
          bgcolor: 'action.selected'
        },
        transition: 'background-color 0.3s'
      }}
    >
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          {getIcon()}
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: notification.isRead ? 'normal' : 'bold',
                color: notification.isRead ? 'text.secondary' : 'text.primary'
              }}
            >
              {notification.title}
            </Typography>
          }
          secondary={
            <>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ display: 'block', mb: 0.5 }}
              >
                {notification.message}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
              >
                {getFormattedTime()}
              </Typography>
            </>
          }
          secondaryTypographyProps={{ 
            component: 'div'
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default NotificationItem;
