import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import useForm from '../hooks/useForm';
import api from '../services/api';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);

  const steps = ['Informações pessoais', 'Credenciais de acesso'];

  const initialValues: RegisterFormValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const validate = (values: RegisterFormValues) => {
    const errors: Partial<Record<keyof RegisterFormValues, string>> = {};
    
    if (activeStep === 0) {
      if (!values.name) {
        errors.name = 'Nome é obrigatório';
      }
      
      if (!values.email) {
        errors.email = 'Email é obrigatório';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
        errors.email = 'Email inválido';
      }
    } else if (activeStep === 1) {
      if (!values.password) {
        errors.password = 'Senha é obrigatória';
      } else if (values.password.length < 8) {
        errors.password = 'Senha deve ter pelo menos 8 caracteres';
      } else if (!/[A-Z]/.test(values.password)) {
        errors.password = 'Senha deve conter pelo menos uma letra maiúscula';
      } else if (!/[a-z]/.test(values.password)) {
        errors.password = 'Senha deve conter pelo menos uma letra minúscula';
      } else if (!/[0-9]/.test(values.password)) {
        errors.password = 'Senha deve conter pelo menos um número';
      } else if (!/[^A-Za-z0-9]/.test(values.password)) {
        errors.password = 'Senha deve conter pelo menos um caractere especial';
      }
      
      if (!values.confirmPassword) {
        errors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (values.password !== values.confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
      }
    }
    
    return errors;
  };

  const handleNext = () => {
    const validationErrors = validate(values);
    
    // Verifica se existem erros para o passo atual
    const hasErrors = Object.keys(validationErrors).some(key => {
      if (activeStep === 0 && (key === 'name' || key === 'email')) {
        return Boolean(validationErrors[key as keyof RegisterFormValues]);
      }
      if (activeStep === 1 && (key === 'password' || key === 'confirmPassword')) {
        return Boolean(validationErrors[key as keyof RegisterFormValues]);
      }
      return false;
    });
    
    if (!hasErrors) {
      setActiveStep(prevStep => prevStep + 1);
    } else {
      // Define todos os campos deste passo como "tocados" para mostrar os erros
      const newTouched: Partial<Record<keyof RegisterFormValues, boolean>> = { ...touched };
      
      if (activeStep === 0) {
        newTouched.name = true;
        newTouched.email = true;
      } else {
        newTouched.password = true;
        newTouched.confirmPassword = true;
      }
      
      // Atualiza os erros
      setErrors(validationErrors);
      // Atualiza os campos tocados
      setTouched(newTouched);
    }
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleSubmit = async (values: RegisterFormValues) => {
    setError(null);
    setIsRegistering(true);
    
    try {
      // Faz o registro
      await api.post('/auth/register', {
        email: values.email,
        password: values.password,
        username: values.name.toLowerCase().replace(/\s+/g, '.'),
        full_name: values.name,
      });
      
      // Faz login automaticamente após o registro
      await signIn(values.email, values.password);
      
      // Redireciona para o dashboard
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao fazer cadastro. Por favor, tente novamente.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: submitForm,
    setTouched,
    setErrors,
  } = useForm({
    initialValues,
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Criar Conta - CotAi
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={submitForm} noValidate>
            {activeStep === 0 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="name"
                  label="Nome completo"
                  name="name"
                  autoComplete="name"
                  autoFocus
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email"
                  name="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />
              </>
            )}
            
            {activeStep === 1 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Senha"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirmar senha"
                  type="password"
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                />
              </>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{ mr: 1 }}
                disabled={activeStep === 0 || isRegistering}
              >
                Voltar
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isRegistering}
                >
                  {isRegistering ? <CircularProgress size={24} /> : 'Cadastrar'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={isRegistering}
                >
                  Próximo
                </Button>
              )}
            </Box>
            
            <Box mt={3} textAlign="center">
              <Typography variant="body2">
                Já tem uma conta?{' '}
                <Link to="/login">
                  <Typography component="span" variant="body2" color="primary">
                    Faça login
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
