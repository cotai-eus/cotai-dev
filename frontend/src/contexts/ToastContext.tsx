import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Stack,
  Slide,
  SlideProps,
  Typography,
  IconButton,
  Box,
  Portal,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Tipos de toast
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Interface para o toast
export interface Toast {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  autoHide?: boolean;
  duration?: number;
}

// Interface para o contexto de toast
interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toasts: Toast[];
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

// Criando o contexto
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook para usar o toast
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

// Propriedades do provider
interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  defaultDuration?: number;
}

// Provider de toast
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = { vertical: 'top', horizontal: 'right' },
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Adiciona um toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    
    setToasts((prevToasts) => {
      const newToasts = [...prevToasts, { ...toast, id }];
      
      // Se exceder o número máximo de toasts, remove os mais antigos
      if (newToasts.length > maxToasts) {
        return newToasts.slice(newToasts.length - maxToasts);
      }
      
      return newToasts;
    });
    
    // Configura o auto-hide se necessário
    if (toast.autoHide !== false) {
      const duration = toast.duration || defaultDuration;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [maxToasts, defaultDuration]);
  
  // Remove um toast pelo ID
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);
  
  // Limpa todos os toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  // Funções de conveniência
  const success = useCallback((message: string, title?: string) => {
    addToast({ message, title, type: 'success' });
  }, [addToast]);
  
  const error = useCallback((message: string, title?: string) => {
    addToast({ message, title, type: 'error' });
  }, [addToast]);
  
  const warning = useCallback((message: string, title?: string) => {
    addToast({ message, title, type: 'warning' });
  }, [addToast]);
  
  const info = useCallback((message: string, title?: string) => {
    addToast({ message, title, type: 'info' });
  }, [addToast]);
  
  // Componente de transição
  const SlideTransition = (props: SlideProps) => {
    return <Slide {...props} direction="left" />;
  };
  
  // Renderiza um toast
  const renderToast = (toast: Toast) => {
    const { id, message, title, type } = toast;
    
    // Seleciona o ícone com base no tipo
    const getIcon = () => {
      switch (type) {
        case 'success':
          return <SuccessIcon />;
        case 'error':
          return <ErrorIcon />;
        case 'warning':
          return <WarningIcon />;
        case 'info':
          return <InfoIcon />;
        default:
          return null;
      }
    };
    
    return (
      <Snackbar
        key={id}
        open={true}
        TransitionComponent={SlideTransition}
        anchorOrigin={position}
        sx={{ position: 'relative', mt: 1 }}
      >
        <Alert
          severity={type}
          variant="filled"
          icon={getIcon()}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => removeToast(id)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{
            width: '100%',
            boxShadow: (theme) => theme.shadows[3],
            display: 'flex',
            '.MuiAlert-message': { width: '100%' },
          }}
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          <Typography variant="body2">{message}</Typography>
        </Alert>
      </Snackbar>
    );
  };
  
  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        clearToasts,
        toasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            [position.vertical]: theme => theme.spacing(2),
            [position.horizontal]: theme => theme.spacing(2),
            zIndex: (theme) => theme.zIndex.snackbar,
            pointerEvents: 'none',
          }}
        >
          <Stack spacing={1} alignItems="flex-end">
            {toasts.map((toast) => (
              <Box key={toast.id} sx={{ pointerEvents: 'auto' }}>
                {renderToast(toast)}
              </Box>
            ))}
          </Stack>
        </Box>
      </Portal>
    </ToastContext.Provider>
  );
};

// Exemplo de uso:
/*
// No componente App
<ToastProvider>
  <App />
</ToastProvider>

// Em qualquer componente filho
const { success, error, warning, info } = useToast();

// Para mostrar um toast
success('Operação realizada com sucesso!', 'Sucesso');
error('Algo deu errado!', 'Erro');
warning('Atenção necessária!', 'Aviso');
info('Apenas informando...', 'Informação');
*/
