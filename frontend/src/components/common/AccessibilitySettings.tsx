import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  Close as CloseIcon,
  TextIncrease as TextIncreaseIcon,
  TextDecrease as TextDecreaseIcon,
  FontDownload as FontDownloadIcon,
  FontDownloadOff as FontDownloadOffIcon,
  Animation as AnimationIcon,
  Animation as AnimationOffIcon
} from '@mui/icons-material';

// Tipos para configurações de acessibilidade
interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexicFont: boolean;
  fontSize: number;
  lineSpacing: number;
}

// Valores padrão
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  dyslexicFont: false,
  fontSize: 1, // multiplicador
  lineSpacing: 1.5,
};

// Contexto para as configurações de acessibilidade
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  toggleAccessibilityMenu: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Provider para as configurações de acessibilidade
interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const theme = useTheme();

  // Carrega as configurações do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      // Verifica preferências do sistema
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setSettings(prev => ({ ...prev, reducedMotion: true }));
      }
      if (window.matchMedia('(prefers-contrast: more)').matches) {
        setSettings(prev => ({ ...prev, highContrast: true }));
      }
    }
  }, []);

  // Aplica as configurações de acessibilidade ao CSS
  useEffect(() => {
    // Salva no localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));

    // Aplica as configurações ao elemento raiz (HTML)
    const root = document.documentElement;
    
    // Tamanho da fonte
    root.style.setProperty('--a11y-font-scale', settings.fontSize.toString());
    
    // Espaçamento entre linhas
    root.style.setProperty('--a11y-line-spacing', settings.lineSpacing.toString());
    
    // Fonte para dislexia
    if (settings.dyslexicFont) {
      root.classList.add('a11y-dyslexic-font');
    } else {
      root.classList.remove('a11y-dyslexic-font');
    }
    
    // Alto contraste
    if (settings.highContrast) {
      root.classList.add('a11y-high-contrast');
    } else {
      root.classList.remove('a11y-high-contrast');
    }
    
    // Redução de movimento
    if (settings.reducedMotion) {
      root.classList.add('a11y-reduced-motion');
    } else {
      root.classList.remove('a11y-reduced-motion');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const toggleAccessibilityMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        toggleAccessibilityMenu,
      }}
    >
      {children}
      
      {/* Botão flutuante de acessibilidade */}
      <IconButton
        aria-label="Configurações de acessibilidade"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          zIndex: theme.zIndex.drawer - 1,
          '&:hover': {
            bgcolor: theme.palette.primary.dark,
          },
        }}
        onClick={toggleAccessibilityMenu}
      >
        <AccessibilityIcon />
      </IconButton>
      
      {/* Menu de configurações de acessibilidade */}
      <Drawer
        anchor="right"
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, p: 3 },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Configurações de Acessibilidade
          </Typography>
          <IconButton
            aria-label="Fechar configurações de acessibilidade"
            onClick={() => setIsMenuOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Opções de texto */}
        <Typography variant="subtitle1" component="h3" gutterBottom>
          Texto e Leitura
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography id="font-size-label" gutterBottom>
            Tamanho da Fonte
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextDecreaseIcon sx={{ mr: 1 }} />
            <Slider
              aria-labelledby="font-size-label"
              value={settings.fontSize}
              min={0.8}
              max={1.5}
              step={0.1}
              onChange={(_, value) => updateSettings({ fontSize: value as number })}
              sx={{ mx: 1 }}
            />
            <TextIncreaseIcon sx={{ ml: 1 }} />
          </Box>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography id="line-spacing-label" gutterBottom>
            Espaçamento entre Linhas
          </Typography>
          <Slider
            aria-labelledby="line-spacing-label"
            value={settings.lineSpacing}
            min={1}
            max={2.5}
            step={0.1}
            onChange={(_, value) => updateSettings({ lineSpacing: value as number })}
          />
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.dyslexicFont}
              onChange={(e) => updateSettings({ dyslexicFont: e.target.checked })}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {settings.dyslexicFont ? <FontDownloadIcon sx={{ mr: 1 }} /> : <FontDownloadOffIcon sx={{ mr: 1 }} />}
              <span>Fonte para Dislexia</span>
            </Box>
          }
        />
        
        <Divider sx={{ my: 3 }} />
        
        {/* Opções visuais */}
        <Typography variant="subtitle1" component="h3" gutterBottom>
          Contraste e Movimento
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.highContrast}
              onChange={(e) => updateSettings({ highContrast: e.target.checked })}
            />
          }
          label="Alto Contraste"
          sx={{ mb: 1, display: 'block' }}
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.reducedMotion}
              onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {settings.reducedMotion ? <AnimationOffIcon sx={{ mr: 1 }} /> : <AnimationIcon sx={{ mr: 1 }} />}
              <span>Reduzir Animações</span>
            </Box>
          }
        />
        
        <Divider sx={{ my: 3 }} />
        
        {/* Botões de ação */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button variant="outlined" onClick={resetSettings}>
            Redefinir Padrões
          </Button>
          <Button variant="contained" onClick={() => setIsMenuOpen(false)}>
            Salvar e Fechar
          </Button>
        </Box>
      </Drawer>
    </AccessibilityContext.Provider>
  );
};

// Hook para usar as configurações de acessibilidade
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibility deve ser usado dentro de um AccessibilityProvider');
  }
  
  return context;
};

// Componente para exibir o botão e menu de acessibilidade
export const AccessibilityMenu: React.FC = () => {
  const { toggleAccessibilityMenu } = useAccessibility();
  
  return (
    <IconButton
      onClick={toggleAccessibilityMenu}
      aria-label="Abrir configurações de acessibilidade"
      title="Acessibilidade"
    >
      <AccessibilityIcon />
    </IconButton>
  );
};
