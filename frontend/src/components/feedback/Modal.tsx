import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Drawer as MuiDrawer,
  Theme,
  useTheme,
  useMediaQuery,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { setupFocusTrap } from '../../utils/focusTrap';

// Interface para o Modal
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  hideCloseButton?: boolean;
  titleComponent?: React.ReactNode;
  titleColor?: string;
  dividers?: boolean;
  scroll?: 'paper' | 'body';
}

// Componente Modal
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  hideCloseButton = false,
  titleComponent,
  titleColor,
  dividers = false,
  scroll = 'paper',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Determina se deve ser fullScreen com base na prop e no tamanho da tela
  const isFullScreen = fullScreen || isMobile;
  
  // Setup focus trap for accessibility
  useEffect(() => {
    if (open && modalRef.current) {
      const cleanup = setupFocusTrap(modalRef.current, onClose);
      return cleanup;
    }
  }, [open, onClose]);
  
  // Handler para clicks no backdrop
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disableBackdropClick) {
      event.stopPropagation();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isFullScreen}
      onBackdropClick={handleBackdropClick}
      disableEscapeKeyDown={disableEscapeKeyDown}
      scroll={scroll}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      ref={modalRef}
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: isFullScreen ? 0 : 2,
          // Adiciona padding extra no mobile
          p: isFullScreen ? 0 : undefined,
        },
      }}
    >
      {/* Título personalizado ou padrão */}
      {titleComponent || (
        <DialogTitle
          id="modal-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: titleColor,
            py: 2,
            px: 3,
          }}
        >
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {!hideCloseButton && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              size="small"
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      
      {/* Conteúdo do modal */}
      <DialogContent dividers={dividers} sx={{ py: 2, px: 3 }}>
        {children}
      </DialogContent>
      
      {/* Ações no rodapé, se fornecidas */}
      {actions && (
        <DialogActions sx={{ py: 2, px: 3 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

// Tipos para posição do Drawer
type DrawerPosition = 'right' | 'left' | 'top' | 'bottom';

// Interface para o Drawer
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: DrawerPosition;
  width?: number | string;
  height?: number | string;
  actions?: React.ReactNode;
  hideCloseButton?: boolean;
  titleComponent?: React.ReactNode;
  noPadding?: boolean;
  showBackdrop?: boolean;
  headerDivider?: boolean;
  footerDivider?: boolean;
}

// Componente Drawer
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  children,
  position = 'right',
  width = 400,
  height = '100%',
  actions,
  hideCloseButton = false,
  titleComponent,
  noPadding = false,
  showBackdrop = true,
  headerDivider = true,
  footerDivider = true,
}) => {
  const isHorizontal = position === 'left' || position === 'right';
  
  return (
    <MuiDrawer
      anchor={position}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
        disablePortal: false,
        BackdropProps: {
          invisible: !showBackdrop,
        },
      }}
      PaperProps={{
        sx: {
          width: isHorizontal ? width : '100%',
          height: !isHorizontal ? height : '100%',
          boxSizing: 'border-box',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Cabeçalho do Drawer */}
        {(title || titleComponent) && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 2,
                px: 3,
              }}
            >
              {titleComponent || (
                <Typography variant="h6" component="h2">
                  {title}
                </Typography>
              )}
              
              {!hideCloseButton && (
                <IconButton
                  aria-label="close drawer"
                  onClick={onClose}
                  size="small"
                  edge="end"
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
            {headerDivider && <Divider />}
          </>
        )}
        
        {/* Conteúdo do Drawer */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: noPadding ? 0 : 3,
          }}
        >
          {children}
        </Box>
        
        {/* Ações no rodapé, se fornecidas */}
        {actions && (
          <>
            {footerDivider && <Divider />}
            <Box
              sx={{
                py: 2,
                px: 3,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              {actions}
            </Box>
          </>
        )}
      </Box>
    </MuiDrawer>
  );
};

// Interface para o componente de confirmação
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

// Componente Dialog de confirmação
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
  loading = false,
  maxWidth = 'xs',
}) => {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" id="confirm-dialog-description">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
          autoFocus
        >
          {loading ? 'Processando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
