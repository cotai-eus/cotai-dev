// Component for displaying messages in a conversation
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  CircularProgress,
  Divider,
  Paper,
  useTheme,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Conversation, Message, getConversation, User, markMessagesAsRead } from '../../services/messageService';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import webSocketService from '../../services/webSocketService';
import { MESSAGE_PAGE_SIZE } from '../../config';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageAreaProps {
  conversation: Conversation;
  onBack: () => void;
  isMobile: boolean;
}

const MessageArea: React.FC<MessageAreaProps> = ({ conversation, onBack, isMobile }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [fullConversation, setFullConversation] = useState<Conversation | null>(null);

  // Fetch conversation and initial messages
  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getConversation(conversation.id, MESSAGE_PAGE_SIZE);
      setFullConversation(data);
      setMessages(data.messages.reverse()); // Messages come newest first, we reverse to show oldest first
      setHasMore(data.messages.length === MESSAGE_PAGE_SIZE);
      
      // Mark messages as read
      markMessagesAsUnread(data.messages);
      
      // Join the conversation websocket room
      webSocketService.joinConversation(conversation.id);
    } catch (err) {
      setError('Erro ao carregar mensagens');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  // Load more messages when scrolling up
  const fetchMoreMessages = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const skip = (page + 1) * MESSAGE_PAGE_SIZE;
      const data = await getConversation(conversation.id, MESSAGE_PAGE_SIZE, skip);
      
      if (data.messages.length > 0) {
        setMessages(prevMessages => [...data.messages.reverse(), ...prevMessages]);
        setHasMore(data.messages.length === MESSAGE_PAGE_SIZE);
        setPage(prevPage => prevPage + 1);
        
        // Mark these new messages as read too
        markMessagesAsUnread(data.messages);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [conversation.id, loading, loadingMore, hasMore, page]);

  // Mark messages as read
  const markMessagesAsUnread = useCallback((messagesToMark: Message[]) => {
    const unreadMessages = messagesToMark.filter(
      m => m.sender_id !== fullConversation?.created_by_id && !m.is_read
    );
    
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id);
      markMessagesAsRead(messageIds).catch(err => {
        console.error('Error marking messages as read:', err);
      });
      
      // Also send read receipt via websocket for real-time updates
      webSocketService.sendReadReceipt(conversation.id, messageIds);
    }
  }, [conversation.id, fullConversation?.created_by_id]);

  // Setup infinite scroll using Intersection Observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };
    
    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        fetchMoreMessages();
      }
    }, options);
    
    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMoreMessages]);

  // Initial load
  useEffect(() => {
    fetchConversation();
    
    // Cleanup: leave the conversation room when component unmounts
    return () => {
      webSocketService.leaveConversation(conversation.id);
    };
  }, [fetchConversation, conversation.id]);

  // WebSocket message handler
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.conversation_id === conversation.id) {
        // Update messages
        setMessages(prevMessages => [...prevMessages, message]);
        
        // Mark the message as read if it's not from current user
        if (message.sender_id !== fullConversation?.created_by_id) {
          markMessagesAsUnread([message]);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    
    // Add event listener
    const unsubscribe = webSocketService.onMessage(handleNewMessage);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [conversation.id, fullConversation?.created_by_id, markMessagesAsUnread]);

  // WebSocket typing indicator handler
  useEffect(() => {
    const handleTypingStatus = (userId: number, convId: number, isTyping: boolean) => {
      if (convId === conversation.id) {
        setTypingUsers(prev => {
          if (isTyping) {
            // Add user to typing users if not already there
            const user = fullConversation?.members.find(m => m.id === userId);
            if (user && !prev.some(u => u.id === userId)) {
              return [...prev, user];
            }
          } else {
            // Remove user from typing users
            return prev.filter(u => u.id !== userId);
          }
          return prev;
        });
      }
    };
    
    // Add event listener
    const unsubscribe = webSocketService.onTypingStatus(handleTypingStatus);
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [conversation.id, fullConversation]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, messages.length]);

  // Group messages by date for date separators
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'dd/MM/yyyy');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // Get conversation display name
  const getConversationName = () => {
    if (!fullConversation) return '';
    
    if (fullConversation.name) {
      return fullConversation.name;
    }
    
    return fullConversation.members
      .filter(member => member.id !== fullConversation.created_by_id)
      .map(member => member.full_name)
      .join(', ');
  };

  // Determine which users are typing
  const typingIndicator = typingUsers.length > 0 && (
    <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {typingUsers.map(user => user.full_name).join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
      </Typography>
      <Box sx={{ display: 'flex', ml: 1 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            animation: 'dot-flashing 1s infinite linear alternate',
            animationDelay: '0s',
            mr: 0.5
          }}
        />
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            animation: 'dot-flashing 1s infinite linear alternate',
            animationDelay: '0.5s',
            mr: 0.5
          }}
        />
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            animation: 'dot-flashing 1s infinite linear alternate',
            animationDelay: '1s'
          }}
        />
      </Box>
    </Box>
  );

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        {isMobile && (
          <IconButton edge="start" onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        
        {fullConversation?.is_group ? (
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {(fullConversation.name || 'G').charAt(0).toUpperCase()}
          </Avatar>
        ) : (
          <Avatar
            alt={getConversationName()}
            src={
              fullConversation?.members.find(m => m.id !== fullConversation.created_by_id)?.avatar_url || ''
            }
            sx={{ mr: 2 }}
          />
        )}
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
            {getConversationName()}
          </Typography>
          
          {fullConversation?.is_group && (
            <Typography variant="caption" color="text.secondary">
              {fullConversation.members.length} participantes
            </Typography>
          )}
        </Box>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.mode === 'light' ? '#f5f5f5' : 'background.default',
          p: 2
        }}
      >
        {/* Loading indicator */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            {/* Load more trigger */}
            {hasMore && (
              <Box
                ref={loadMoreTriggerRef}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  py: 2,
                }}
              >
                {loadingMore && <CircularProgress size={24} />}
              </Box>
            )}

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <Box key={date} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Chip
                    label={date}
                    variant="outlined"
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>
                
                {msgs.map((message, index) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isCurrentUser={message.sender_id === fullConversation?.created_by_id}
                    isConsecutive={
                      index > 0 &&
                      msgs[index - 1].sender_id === message.sender_id &&
                      new Date(message.created_at).getTime() - new Date(msgs[index - 1].created_at).getTime() < 60000
                    }
                  />
                ))}
              </Box>
            ))}

            {/* Typing indicator */}
            {typingIndicator}
            
            {/* Ref for scrolling to the latest message */}
            <div ref={messageEndRef} />
          </>
        )}
      </Box>

      {/* Message input */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <MessageInput
          conversationId={conversation.id}
          disabled={loading || !fullConversation}
        />
      </Box>
    </>
  );
};

export default MessageArea;
