import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  IconButton,
  Box,
  useTheme,
  styled,
  Collapse,
  Tooltip,
  Typography
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  Add as AddIcon,
  List as ListIcon,
  BarChart as BarChartIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const drawerWidth = 240;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  subItems?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState<{[key: string]: boolean}>({});

  const toggleSubMenu = (text: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  const isSelected = (path: string) => location.pathname === path;

  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/'
    },
    {
      text: 'Componentes',
      icon: <HelpIcon />,
      path: '/components'
    },
    {
      text: 'Calendário',
      icon: <CalendarIcon />,
      path: '/calendar'
    },
    {
      text: 'Notificações',
      icon: <NotificationsIcon />,
      path: '/notifications'
    },
    {
      text: 'Mensagens',
      icon: <MessageIcon />,
      path: '/messages'
    },
    {
      text: 'Documentos',
      icon: <DocumentIcon />,
      path: '/documents',
      subItems: [
        {
          text: 'Novo Documento',
          icon: <AddIcon />,
          path: '/documents/new'
        },
        {
          text: 'Listar Documentos',
          icon: <ListIcon />,
          path: '/documents/list'
        }
      ]
    },
    {
      text: 'Cotações',
      icon: <AssessmentIcon />,
      path: '/quotations',
      subItems: [
        {
          text: 'Nova Cotação',
          icon: <AddIcon />,
          path: '/quotations/new'
        },
        {
          text: 'Listar Cotações',
          icon: <ListIcon />,
          path: '/quotations/list'
        },
        {
          text: 'Relatórios',
          icon: <BarChartIcon />,
          path: '/quotations/reports'
        }
      ]
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 600) {
      onClose();
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isItemSelected = isSelected(item.path);
    const isSubMenuOpen = openSubMenus[item.text] || false;

    return (
      <React.Fragment key={item.text}>
        <ListItem 
          button 
          onClick={() => hasSubItems ? toggleSubMenu(item.text) : handleNavigation(item.path)}
          sx={{
            minHeight: 48,
            justifyContent: open ? 'initial' : 'center',
            px: 2.5,
            pl: open ? `${(level + 1) * 16}px` : 2.5,
            backgroundColor: isItemSelected ? 'rgba(0, 0, 0, 0.08)' : 'inherit',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          {open ? (
            <ListItemIcon sx={{ minWidth: 0, mr: 3 }}>
              {item.icon}
            </ListItemIcon>
          ) : (
            <Tooltip title={item.text} placement="right">
              <ListItemIcon sx={{ minWidth: 0, mr: 'auto', justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
            </Tooltip>
          )}
          
          <ListItemText 
            primary={item.text} 
            sx={{ 
              opacity: open ? 1 : 0,
              color: isItemSelected ? 'primary.main' : 'inherit'
            }}
          />
          
          {hasSubItems && open && (
            isSubMenuOpen ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItem>
        
        {hasSubItems && open && (
          <Collapse in={isSubMenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems?.map(subItem => renderMenuItem(subItem, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          ...(!open && {
            width: theme.spacing(7),
            [theme.breakpoints.up('sm')]: {
              width: theme.spacing(9),
            },
            overflowX: 'hidden',
          }),
        },
      }}
      variant="permanent"
      open={open}
      anchor="left"
    >
      <DrawerHeader>
        <Box sx={{ flexGrow: 1, pl: 2, display: open ? 'block' : 'none' }}>
          <Typography variant="h6" color="primary">CotAi</Typography>
        </Box>
        <IconButton onClick={onClose}>
          {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      
      <List>
        {menuItems.map(item => renderMenuItem(item))}
      </List>
      
      <Divider />
      <List>
        <ListItem 
          button 
          onClick={() => handleNavigation('/settings')}
          sx={{
            minHeight: 48,
            justifyContent: open ? 'initial' : 'center',
            px: 2.5,
          }}
        >
          {open ? (
            <ListItemIcon sx={{ minWidth: 0, mr: 3 }}>
              <SettingsIcon />
            </ListItemIcon>
          ) : (
            <Tooltip title="Configurações" placement="right">
              <ListItemIcon sx={{ minWidth: 0, mr: 'auto', justifyContent: 'center' }}>
                <SettingsIcon />
              </ListItemIcon>
            </Tooltip>
          )}
          
          <ListItemText 
            primary="Configurações" 
            sx={{ opacity: open ? 1 : 0 }}
          />
        </ListItem>
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/help')}
          sx={{
            minHeight: 48,
            justifyContent: open ? 'initial' : 'center',
            px: 2.5,
          }}
        >
          {open ? (
            <ListItemIcon sx={{ minWidth: 0, mr: 3 }}>
              <HelpIcon />
            </ListItemIcon>
          ) : (
            <Tooltip title="Ajuda" placement="right">
              <ListItemIcon sx={{ minWidth: 0, mr: 'auto', justifyContent: 'center' }}>
                <HelpIcon />
              </ListItemIcon>
            </Tooltip>
          )}
          
          <ListItemText 
            primary="Ajuda" 
            sx={{ opacity: open ? 1 : 0 }}
          />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
