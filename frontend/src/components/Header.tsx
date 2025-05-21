import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Avatar,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  ListItemIcon,
  Switch,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const [anchorElSearch, setAnchorElSearch] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };
  
  const handleOpenSearchMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElSearch(event.currentTarget);
  };

  const handleCloseSearchMenu = () => {
    setAnchorElSearch(null);
  };
  
  const handleProfileClick = () => {
    handleCloseUserMenu();
    navigate('/profile');
  };
  
  const handleSettingsClick = () => {
    handleCloseUserMenu();
    navigate('/settings');
  };
  
  const handleLogoutClick = () => {
    handleCloseUserMenu();
    signOut();
    navigate('/login');
  };
  
  const handleViewAllNotifications = () => {
    handleCloseNotificationsMenu();
    navigate('/notifications');
  };

  const mockNotifications = [
    { id: 1, title: 'Nova cotação disponível', read: false },
    { id: 2, title: 'Prazo de licitação se aproximando', read: false },
    { id: 3, title: 'Documento processado com sucesso', read: true },
    { id: 4, title: 'Nova mensagem recebida', read: true }
  ];
  
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <AppBar 
      position="static" 
      elevation={0} 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
          CotAi
        </Typography>

        <Box sx={{ flexGrow: 1 }} />
        
        {/* Busca */}
        <Box sx={{ flexGrow: 0, mr: 2 }}>
          <Tooltip title="Buscar">
            <IconButton onClick={handleOpenSearchMenu} color="inherit">
              <SearchIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Toggle de tema */}
        <Box sx={{ flexGrow: 0, mr: 2, display: 'flex', alignItems: 'center' }}>
          <Tooltip title={`Alternar para tema ${mode === 'light' ? 'escuro' : 'claro'}`}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 0.5 }}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notificações */}
        <Box sx={{ flexGrow: 0, mr: 2 }}>
          <Tooltip title="Notificações">
            <IconButton onClick={handleOpenNotificationsMenu} color="inherit">
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-notifications"
            anchorEl={anchorElNotifications}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElNotifications)}
            onClose={handleCloseNotificationsMenu}
            PaperProps={{
              sx: {
                width: 320,
                maxHeight: 400,
              }
            }}
          >
            <Typography sx={{ p: 2, fontWeight: 600 }}>Notificações</Typography>
            <Divider />
            {mockNotifications.map((notification) => (
              <MenuItem 
                key={notification.id} 
                onClick={handleCloseNotificationsMenu}
                sx={{ 
                  py: 2,
                  borderLeft: notification.read ? 'none' : '4px solid',
                  borderColor: 'primary.main',
                  backgroundColor: notification.read ? 'inherit' : 'rgba(0, 0, 0, 0.04)'
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: notification.read ? 'normal' : 'bold'
                  }}
                >
                  {notification.title}
                </Typography>
              </MenuItem>
            ))}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'primary.main', 
                  cursor: 'pointer', 
                  fontWeight: 'medium',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={handleViewAllNotifications}
              >
                Ver todas as notificações
              </Typography>
            </Box>
          </Menu>
        </Box>

        {/* Menu do usuário */}
        <Box sx={{ flexGrow: 0 }}>
          <Tooltip title="Configurações de conta">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : <AccountCircleIcon />}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            {user && (
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {user.name || 'Usuário'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email || 'usuario@example.com'}
                </Typography>
              </Box>
            )}
            <Divider />
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              <Typography>Perfil</Typography>
            </MenuItem>
            <MenuItem onClick={handleSettingsClick}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              <Typography>Configurações</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              <Typography>Sair</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
