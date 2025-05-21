import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Typography
} from '@mui/material';
import { Conversation, ConversationCreate, User, createConversation } from '../../services/messageService';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'direct' | 'group';
  onCreateConversation: (conversation: Conversation) => void;
}

const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onClose,
  type,
  onCreateConversation
}) => {
  const [name, setName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available users
  useEffect(() => {
    if (open) {
      const fetchUsers = async () => {
        try {
          setUserLoading(true);
          const response = await axios.get(`${API_BASE_URL}/users`);
          setAvailableUsers(response.data);
        } catch (err) {
          console.error('Error fetching users:', err);
        } finally {
          setUserLoading(false);
        }
      };

      fetchUsers();
    } else {
      // Reset state when dialog closes
      setName('');
      setSelectedUsers([]);
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      setError('Selecione pelo menos um usuário');
      return;
    }

    if (type === 'group' && !name.trim()) {
      setError('Nome do grupo é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const conversationData: ConversationCreate = {
        is_group: type === 'group',
        name: type === 'group' ? name : undefined,
        member_ids: selectedUsers.map(user => user.id)
      };

      const newConversation = await createConversation(conversationData);
      onCreateConversation(newConversation);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{type === 'direct' ? 'Nova Conversa' : 'Novo Grupo'}</DialogTitle>
      <DialogContent>
        {type === 'group' && (
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Nome do Grupo"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
        )}

        <Autocomplete
          multiple
          id="users"
          options={availableUsers}
          loading={userLoading}
          getOptionLabel={(option) => option.full_name || option.username}
          value={selectedUsers}
          onChange={(_, newValue) => setSelectedUsers(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Usuários"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {userLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                label={option.full_name}
                {...getTagProps({ index })}
              />
            ))
          }
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained" 
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewConversationDialog;
