// Main messaging page component
import React, { useEffect, useState } from 'react';
import { Box, Grid, useMediaQuery, useTheme } from '@mui/material';
import ConversationList from '../components/messages/ConversationList';
import MessageArea from '../components/messages/MessageArea';
import { Conversation } from '../services/messageService';
import webSocketService from '../services/webSocketService';
import MessageSearchResult from '../components/messages/MessageSearchResult';

const MessagesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [conversationsKey, setConversationsKey] = useState(0); // For forcing refresh of conversation list

  // Handle WebSocket reconnection
  useEffect(() => {
    const unsubscribe = webSocketService.onConnectionChange((connected) => {
      if (connected) {
        // Force refresh of conversations on reconnection
        setConversationsKey(prevKey => prevKey + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsSearchOpen(false);
    
    if (isMobile) {
      // In mobile view, hide the conversation list when a conversation is selected
      document.getElementById('conversation-list-container')?.classList.add('hidden');
      document.getElementById('message-area-container')?.classList.remove('hidden');
    }
  };

  // Handle back button in mobile view
  const handleBackToList = () => {
    if (isMobile) {
      document.getElementById('conversation-list-container')?.classList.remove('hidden');
      document.getElementById('message-area-container')?.classList.add('hidden');
    }
  };

  // Handle search
  const handleSearch = (results: any[]) => {
    setSearchResults(results);
    setIsSearchOpen(true);
  };

  // Handle closing search results
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <Grid container sx={{ height: '100%' }}>
        {/* Conversation List */}
        <Grid
          item
          xs={12}
          md={4}
          id="conversation-list-container"
          sx={{
            height: '100%',
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            ...(isMobile && activeConversation ? { display: 'none' } : {})
          }}
        >
          <ConversationList
            key={conversationsKey}
            onSelectConversation={handleConversationSelect}
            activeConversationId={activeConversation?.id}
            onSearch={handleSearch}
          />
        </Grid>

        {/* Message Area */}
        <Grid
          item
          xs={12}
          md={8}
          id="message-area-container"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            ...(isMobile && !activeConversation ? { display: 'none' } : {})
          }}
        >
          {isSearchOpen ? (
            <MessageSearchResult
              results={searchResults}
              onClose={handleCloseSearch}
              onSelectConversation={handleConversationSelect}
            />
          ) : activeConversation ? (
            <MessageArea
              conversation={activeConversation}
              onBack={handleBackToList}
              isMobile={isMobile}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                backgroundColor: theme.palette.background.default
              }}
            >
              <Box sx={{ p: 3, textAlign: 'center', color: theme.palette.text.secondary }}>
                Selecione uma conversa para começar a enviar mensagens
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagesPage;
