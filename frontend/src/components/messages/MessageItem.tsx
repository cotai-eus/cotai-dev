// Component for displaying a single message
import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Link,
} from '@mui/material';
import { Message, getAttachmentUrl } from '../../services/messageService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplyIcon from '@mui/icons-material/Reply';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AttachmentIcon from '@mui/icons-material/Attachment';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  isConsecutive: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isCurrentUser, isConsecutive }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Format timestamp
  const formattedTime = format(new Date(message.created_at), 'HH:mm');

  // Function to get appropriate icon for file type
  const getAttachmentIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon fontSize="small" />;
    } else if (fileType === 'application/pdf') {
      return <PictureAsPdfIcon fontSize="small" />;
    } else if (
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return <DescriptionIcon fontSize="small" />;
    } else {
      return <InsertDriveFileIcon fontSize="small" />;
    }
  };

  // Check if message is read
  const isRead = message.read_receipts && message.read_receipts.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        mb: 1,
        mt: isConsecutive ? 0.5 : 2,
      }}
    >
      {!isConsecutive && !isCurrentUser && (
        <Avatar
          alt={message.sender.full_name}
          src={message.sender.avatar_url || ''}
          sx={{ width: 32, height: 32, mr: 1, mt: 0.5 }}
        />
      )}
      
      {!isConsecutive && isCurrentUser && (
        <Box sx={{ width: 32, mr: 1 }} /> // Empty space to align with avatar
      )}
      
      {isConsecutive && !isCurrentUser && <Box sx={{ width: 32, mr: 1 }} />}

      <Box sx={{ maxWidth: '75%' }}>
        {!isConsecutive && !isCurrentUser && (
          <Typography
            variant="caption"
            sx={{ ml: 1, mb: 0.5, color: 'text.secondary', display: 'block' }}
          >
            {message.sender.full_name}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-end', flexDirection: isCurrentUser ? 'row-reverse' : 'row' }}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
              color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
              boxShadow: 1,
              position: 'relative',
              '&::after': isCurrentUser
                ? {
                    content: '""',
                    position: 'absolute',
                    right: -10,
                    top: 'calc(50% - 5px)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: `10px solid ${(theme) => theme.palette.primary.main}`,
                  }
                : isConsecutive
                ? {}
                : {
                    content: '""',
                    position: 'absolute',
                    left: -10,
                    top: 'calc(50% - 5px)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: `10px solid ${(theme) => theme.palette.background.paper}`,
                  },
            }}
          >
            {/* Message Content */}
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </Typography>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {message.attachments.map((attachment) => (
                  <Link
                    key={attachment.id}
                    href={getAttachmentUrl(attachment.id)}
                    target="_blank"
                    rel="noopener"
                    underline="hover"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: isCurrentUser ? 'primary.contrastText' : 'primary.main',
                      mt: 0.5,
                    }}
                  >
                    {getAttachmentIcon(attachment.file_type)}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {attachment.file_name}
                    </Typography>
                  </Link>
                ))}
              </Box>
            )}

            {/* Time and read status */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mt: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{ opacity: 0.7, mr: isCurrentUser ? 0 : 0.5 }}
              >
                {formattedTime}
              </Typography>

              {isCurrentUser && (
                <Tooltip title={isRead ? "Lida" : "Enviada"}>
                  <DoneAllIcon
                    fontSize="inherit"
                    sx={{
                      ml: 0.5,
                      fontSize: '0.875rem',
                      opacity: 0.7,
                      color: isRead ? '#8BC34A' : 'inherit',
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          </Paper>

          {/* Message actions */}
          <IconButton
            size="small"
            sx={{
              mx: 0.5,
              opacity: 0,
              '&:hover': { opacity: 1 },
              '@media (hover: none)': {
                opacity: 1,
              },
            }}
            onClick={handleClick}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: isCurrentUser ? 'left' : 'right',
            }}
          >
            <MenuItem onClick={handleClose}>
              <ListItemIcon>
                <ReplyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Responder</ListItemText>
            </MenuItem>
            
            {isCurrentUser && (
              <MenuItem onClick={handleClose}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Excluir</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

export default MessageItem;
