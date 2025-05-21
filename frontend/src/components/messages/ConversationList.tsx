// Component for displaying the list of conversations
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Badge,
  Divider,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation, getConversations, searchMessages } from '../../services/messageService';
import NewConversationDialog from './NewConversationDialog';
import { debounce } from 'lodash';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  activeConversationId?: number;
  onSearch: (results: any[]) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  activeConversationId,
  onSearch
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'direct' | 'group'>('direct');

  // Load conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      setError('Erro ao carregar conversas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle search with debounce
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) return;
      
      try {
        setIsSearching(true);
        const results = await searchMessages(query);
        onSearch(results);
      } catch (err) {
        console.error('Erro na pesquisa:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [onSearch]
  );

  // Search input change handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      handleSearch(query);
    }
  };

  // Handle dialog open
  const handleOpenDialog = (type: 'direct' | 'group') => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  // Handle conversation creation
  const handleCreateConversation = async (newConversation: Conversation) => {
    setConversations(prev => [newConversation, ...prev]);
    onSelectConversation(newConversation);
    setIsDialogOpen(false);
    
    // Refresh conversations to ensure we have the latest data
    fetchConversations();
  };

  return (
    <>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Pesquisar mensagens..."
          value={searchQuery}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('direct')}
            sx={{ flexGrow: 1 }}
            size="small"
          >
            Nova Conversa
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupAddIcon />}
            onClick={() => handleOpenDialog('group')}
            size="small"
            sx={{ flexGrow: 1 }}
          >
            Novo Grupo
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
            {error}
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Nenhuma conversa encontrada
          </Box>
        ) : (
          <List disablePadding>
            {conversations.map((conversation, index) => {
              // Determine the conversation display name
              const displayName = conversation.name || (
                conversation.members
                  .filter(member => member.id !== conversation.created_by_id)
                  .map(member => member.full_name)
                  .join(', ')
              );
              
              // Avatar for the conversation (group icon or the other member's avatar)
              const avatarSrc = !conversation.is_group && conversation.members.length === 2
                ? conversation.members.find(m => m.id !== conversation.created_by_id)?.avatar_url
                : undefined;
              
              // Get last message preview
              const lastMessage = conversation.last_message;
              
              return (
                <React.Fragment key={conversation.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    button
                    selected={activeConversationId === conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    sx={{ 
                      py: 1.5,
                      bgcolor: activeConversationId === conversation.id ? 'action.selected' : 'inherit',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      {conversation.is_group ? (
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(conversation.name || 'G').charAt(0).toUpperCase()}
                        </Avatar>
                      ) : (
                        <Avatar alt={displayName} src={avatarSrc} />
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ 
                              flexGrow: 1, 
                              fontWeight: conversation.last_message && !conversation.last_message.is_read ? 700 : 400 
                            }}
                          >
                            {displayName}
                          </Typography>
                          {conversation.last_message && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                                addSuffix: false,
                                locale: ptBR
                              })}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        lastMessage ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{
                                flexGrow: 1,
                                fontWeight: !lastMessage.is_read ? 700 : 400,
                                maxWidth: '180px',
                              }}
                            >
                              {lastMessage.content}
                            </Typography>
                            {!lastMessage.is_read && (
                              <Badge
                                color="primary"
                                variant="dot"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sem mensagens
                          </Typography>
                        )
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      <NewConversationDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        type={dialogType}
        onCreateConversation={handleCreateConversation}
      />
    </>
  );
};

export default ConversationList;
