import React from 'react';
import { Box, Typography, IconButton, List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Message, Conversation } from '../../services/messageService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageSearchResultProps {
  results: Message[];
  onClose: () => void;
  onSelectConversation: (conversation: Conversation) => void;
}

const MessageSearchResult: React.FC<MessageSearchResultProps> = ({ results, onClose, onSelectConversation }) => {
  // Group messages by conversation
  const groupedResults = results.reduce((acc: { [key: number]: Message[] }, message: Message) => {
    if (!acc[message.conversation_id]) {
      acc[message.conversation_id] = [];
    }
    acc[message.conversation_id].push(message);
    return acc;
  }, {});

  const handleMessageClick = (message: Message) => {
    // Create a conversation object from the message
    const conversation: Conversation = {
      id: message.conversation_id,
      is_group: false, // This is a placeholder, will be updated when the conversation is loaded
      created_at: '',
      updated_at: '',
      created_by_id: 0,
      created_by: message.sender,
      members: [message.sender]
    };
    
    onSelectConversation(conversation);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Resultados da pesquisa
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {results.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          Nenhuma mensagem encontrada
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Paper elevation={0} sx={{ bgcolor: 'background.paper' }}>
            <List>
              {results.map((message, index) => (
                <React.Fragment key={message.id}>
                  {index > 0 && <Divider variant="inset" component="li" />}
                  <ListItem
                    alignItems="flex-start"
                    button
                    onClick={() => handleMessageClick(message)}
                    sx={{ 
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar alt={message.sender.full_name} src={message.sender.avatar_url || ''} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {message.sender.full_name}
                          {' '}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                          </Typography>
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                          }}
                        >
                          {message.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default MessageSearchResult;
