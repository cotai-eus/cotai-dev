// Component for message input with emoji support and file uploads
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Badge,
  Popover,
  Paper,
  Typography,
  List,
  ListItem,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CancelIcon from '@mui/icons-material/Cancel';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { sendMessage } from '../../services/messageService';
import webSocketService from '../../services/webSocketService';
import { TYPING_DEBOUNCE_TIME, MAX_UPLOAD_SIZE, ALLOWED_ATTACHMENT_TYPES } from '../../config';
import { debounce } from 'lodash';

interface MessageInputProps {
  conversationId: number;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ conversationId, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emoji picker open state
  const isEmojiPickerOpen = Boolean(emojiAnchorEl);

  // Toggle emoji picker
  const handleEmojiPickerOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiPickerClose = () => {
    setEmojiAnchorEl(null);
  };

  // Insert emoji at cursor position
  const insertEmoji = (emoji: any) => {
    const textField = textFieldRef.current?.querySelector('textarea');
    if (!textField) return;

    const start = textField.selectionStart || 0;
    const end = textField.selectionEnd || 0;
    const newMessage = message.substring(0, start) + emoji.native + message.substring(end);
    
    setMessage(newMessage);
    
    // Focus back to the text field and set cursor position after the inserted emoji
    setTimeout(() => {
      if (textField) {
        textField.focus();
        const newPosition = start + emoji.native.length;
        textField.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const newFiles = Array.from(selectedFiles);
    
    // Validate file size and type
    const invalidFiles = newFiles.filter(file => {
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(`O arquivo ${file.name} excede o tamanho máximo de ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`);
        return true;
      }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        setError(`O tipo de arquivo ${file.type} não é permitido`);
        return true;
      }
      return false;
    });
    
    if (invalidFiles.length > 0) return;
    
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
    
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle typing status
  const notifyTyping = debounce(() => {
    webSocketService.sendTypingStatus(conversationId, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing status
    typingTimeoutRef.current = setTimeout(() => {
      webSocketService.sendTypingStatus(conversationId, false);
    }, TYPING_DEBOUNCE_TIME * 2);
  }, TYPING_DEBOUNCE_TIME);

  // Handle message input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (e.target.value.trim()) {
      notifyTyping();
    } else if (typingTimeoutRef.current) {
      // If message is empty, stop typing status immediately
      clearTimeout(typingTimeoutRef.current);
      webSocketService.sendTypingStatus(conversationId, false);
    }
  };

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        webSocketService.sendTypingStatus(conversationId, false);
      }
      notifyTyping.cancel();
    };
  }, [conversationId, notifyTyping]);

  // Send message
  const handleSendMessage = async () => {
    // Don't send if input is empty and no files are attached
    if (!message.trim() && files.length === 0) return;
    
    try {
      setSending(true);
      setError('');
      
      await sendMessage(message.trim(), conversationId, files);
      
      setMessage('');
      setFiles([]);
      
      // Clear typing status
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        webSocketService.sendTypingStatus(conversationId, false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key press to send message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box>
      {/* File input (hidden) */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
      />

      {/* File preview */}
      {files.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              Anexos ({files.length})
            </Typography>
            <Button
              size="small"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setFiles([])}
            >
              Remover todos
            </Button>
          </Box>
          
          <List dense sx={{ maxHeight: '150px', overflow: 'auto' }}>
            {files.map((file, index) => (
              <ListItem
                key={`${file.name}-${index}`}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => removeFile(index)}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Typography variant="body2" noWrap sx={{ maxWidth: '90%' }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </Typography>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Error message */}
      {error && (
        <Typography color="error" variant="caption" sx={{ mb: 1, display: 'block' }}>
          {error}
        </Typography>
      )}

      {/* Message input */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
        <Tooltip title="Adicionar anexo">
          <IconButton onClick={handleFileSelect} disabled={disabled || sending}>
            <Badge badgeContent={files.length} color="primary" invisible={files.length === 0}>
              <AttachFileIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <TextField
          ref={textFieldRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder="Digite uma mensagem..."
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          disabled={disabled || sending}
          InputProps={{
            sx: { pr: 1 },
          }}
          sx={{ mx: 1 }}
        />

        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Emojis">
            <IconButton onClick={handleEmojiPickerOpen} disabled={disabled || sending}>
              <EmojiEmotionsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Enviar">
            <span>
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={disabled || sending || (!message.trim() && files.length === 0)}
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Emoji picker */}
      <Popover
        open={isEmojiPickerOpen}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiPickerClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => {
            insertEmoji(emoji);
            handleEmojiPickerClose();
          }}
          locale="pt"
        />
      </Popover>
    </Box>
  );
};

export default MessageInput;
