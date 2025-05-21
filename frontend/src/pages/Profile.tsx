import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { Person, Security, Notifications } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import useForm from '../hooks/useForm';
import api from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

interface ProfileFormValues {
  name: string;
  email: string;
  username: string;
  bio: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  webNotifications: boolean;
  smsNotifications: boolean;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialProfileValues: ProfileFormValues = {
    name: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
    bio: '',
  };

  const initialPasswordValues: PasswordFormValues = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  const initialNotificationPreferences: NotificationPreferences = {
    emailNotifications: true,
    webNotifications: true,
    smsNotifications: false,
  };

  const validateProfile = (values: ProfileFormValues) => {
    const errors: Partial<Record<keyof ProfileFormValues, string>> = {};
    
    if (!values.name) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!values.email) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!values.username) {
      errors.username = 'Nome de usuário é obrigatório';
    } else if (values.username.length < 3) {
      errors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }
    
    return errors;
  };

  const validatePassword = (values: PasswordFormValues) => {
    const errors: Partial<Record<keyof PasswordFormValues, string>> = {};
    
    if (!values.currentPassword) {
      errors.currentPassword = 'Senha atual é obrigatória';
    }
    
    if (!values.newPassword) {
      errors.newPassword = 'Nova senha é obrigatória';
    } else if (values.newPassword.length < 8) {
      errors.newPassword = 'Nova senha deve ter pelo menos 8 caracteres';
    } else if (!/[A-Z]/.test(values.newPassword)) {
      errors.newPassword = 'Nova senha deve conter pelo menos uma letra maiúscula';
    } else if (!/[a-z]/.test(values.newPassword)) {
      errors.newPassword = 'Nova senha deve conter pelo menos uma letra minúscula';
    } else if (!/[0-9]/.test(values.newPassword)) {
      errors.newPassword = 'Nova senha deve conter pelo menos um número';
    } else if (!/[^A-Za-z0-9]/.test(values.newPassword)) {
      errors.newPassword = 'Nova senha deve conter pelo menos um caractere especial';
    }
    
    if (!values.confirmPassword) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (values.newPassword !== values.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }
    
    return errors;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSuccess(null);
    setError(null);
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setSuccess(null);
    setError(null);
    setIsSubmitting(true);
    
    try {
      const response = await api.put('/users/profile', {
        full_name: values.name,
        username: values.username,
        bio: values.bio,
      });
      
      updateUser({
        ...user!,
        name: values.name,
        username: values.username,
      });
      
      setSuccess('Perfil atualizado com sucesso');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao atualizar perfil. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setSuccess(null);
    setError(null);
    setIsSubmitting(true);
    
    try {
      await api.post('/auth/change-password', {
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      
      setSuccess('Senha alterada com sucesso');
      
      // Limpa os campos
      passwordForm.resetForm();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao alterar senha. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationPreferencesSubmit = async (values: NotificationPreferences) => {
    setSuccess(null);
    setError(null);
    setIsSubmitting(true);
    
    try {
      await api.put('/users/notification-preferences', values);
      setSuccess('Preferências de notificação atualizadas com sucesso');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao atualizar preferências de notificação. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const profileForm = useForm({
    initialValues: initialProfileValues,
    validate: validateProfile,
    onSubmit: handleProfileSubmit,
  });

  const passwordForm = useForm({
    initialValues: initialPasswordValues,
    validate: validatePassword,
    onSubmit: handlePasswordSubmit,
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Configurações do Perfil
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs">
              <Tab icon={<Person />} label="Perfil" id="profile-tab-0" aria-controls="profile-tabpanel-0" />
              <Tab icon={<Security />} label="Segurança" id="profile-tab-1" aria-controls="profile-tabpanel-1" />
              <Tab icon={<Notifications />} label="Notificações" id="profile-tab-2" aria-controls="profile-tabpanel-2" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={profileForm.handleSubmit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12} display="flex" justifyContent="center">
                  <Avatar
                    sx={{ width: 100, height: 100, fontSize: 40 }}
                    alt={user?.name || 'User'}
                    src="/static/images/avatar/1.jpg"
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    name="name"
                    label="Nome completo"
                    value={profileForm.values.name}
                    onChange={profileForm.handleChange}
                    onBlur={profileForm.handleBlur}
                    error={profileForm.touched.name && Boolean(profileForm.errors.name)}
                    helperText={profileForm.touched.name && profileForm.errors.name}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    name="username"
                    label="Nome de usuário"
                    value={profileForm.values.username}
                    onChange={profileForm.handleChange}
                    onBlur={profileForm.handleBlur}
                    error={profileForm.touched.username && Boolean(profileForm.errors.username)}
                    helperText={profileForm.touched.username && profileForm.errors.username}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    name="email"
                    label="Email"
                    type="email"
                    value={profileForm.values.email}
                    onChange={profileForm.handleChange}
                    onBlur={profileForm.handleBlur}
                    error={profileForm.touched.email && Boolean(profileForm.errors.email)}
                    helperText={profileForm.touched.email && profileForm.errors.email}
                    disabled
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="bio"
                    label="Biografia"
                    multiline
                    rows={4}
                    value={profileForm.values.bio}
                    onChange={profileForm.handleChange}
                    onBlur={profileForm.handleBlur}
                    error={profileForm.touched.bio && Boolean(profileForm.errors.bio)}
                    helperText={profileForm.touched.bio && profileForm.errors.bio}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar alterações'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Box component="form" onSubmit={passwordForm.handleSubmit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    name="currentPassword"
                    label="Senha atual"
                    type="password"
                    value={passwordForm.values.currentPassword}
                    onChange={passwordForm.handleChange}
                    onBlur={passwordForm.handleBlur}
                    error={passwordForm.touched.currentPassword && Boolean(passwordForm.errors.currentPassword)}
                    helperText={passwordForm.touched.currentPassword && passwordForm.errors.currentPassword}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    name="newPassword"
                    label="Nova senha"
                    type="password"
                    value={passwordForm.values.newPassword}
                    onChange={passwordForm.handleChange}
                    onBlur={passwordForm.handleBlur}
                    error={passwordForm.touched.newPassword && Boolean(passwordForm.errors.newPassword)}
                    helperText={passwordForm.touched.newPassword && passwordForm.errors.newPassword}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    name="confirmPassword"
                    label="Confirmar nova senha"
                    type="password"
                    value={passwordForm.values.confirmPassword}
                    onChange={passwordForm.handleChange}
                    onBlur={passwordForm.handleBlur}
                    error={passwordForm.touched.confirmPassword && Boolean(passwordForm.errors.confirmPassword)}
                    helperText={passwordForm.touched.confirmPassword && passwordForm.errors.confirmPassword}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Alterar senha'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Box component="form" noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Preferências de notificação
                  </Typography>
                </Grid>
                
                {/* Aqui pode-se adicionar checkboxes, switches, etc. para configurações de notificação */}
                
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar preferências'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
